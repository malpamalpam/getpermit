import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

/**
 * Cron: sends auto-emails directly to foreigners about expiring documents.
 * Runs daily at 8:00 AM. Only sends if not already sent recently (per notification log).
 *
 * Logic:
 * - WP/OŚW: only for foreigners WITHOUT active residence permit
 * - Residence permits: always
 * - Language: based on foreigner's jezykPreferowany field (default: pl)
 * - Avoids duplicate sends by checking fdk_notification_logs
 */

const FROM = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";
const RESEND_COOLDOWN_DAYS = 14; // Don't re-send to same person for same doc type within 14 days

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

type Lang = "pl" | "en" | "ru";

function getWorkPermitEmail(lang: Lang, typDokumentu: string, dataWygasniecia: string) {
  const templates: Record<Lang, { subject: string; body: string }> = {
    pl: {
      subject: "Informacja o kończącym się dokumencie legalizacyjnym",
      body: `Dzień dobry,

Informujemy, że ważność Pana/i dokumentu ${typDokumentu} upływa w dniu ${dataWygasniecia}.

Jeśli jest Pan/i zainteresowany/a dalszym wykonywaniem pracy dla Fundacja Firma Dla Każdego, prosimy o przesłanie potwierdzenia e-mail na adres legalizacja@firmadlakazdego.pl. Dalsze kroki dotyczące uzyskania nowego dokumentu zostaną przekazane po otrzymaniu potwierdzenia.

W przypadku braku odpowiedzi na tego maila, kontynuowanie pracy może być znacznie utrudnione lub może spowodować przerwę w zatrudnieniu.

Pozdrawiamy
Zespół Legalizacji FDK`,
    },
    en: {
      subject: "Information about expiring legalization document",
      body: `Good morning,

We would like to inform you that your document ${typDokumentu} expires on ${dataWygasniecia}.

If you are interested in continuing your work for the Firma Dla Każdego Foundation, please send an email confirmation to legalizacja@firmadlakazdego.pl. Further steps regarding obtaining a new document will be provided after receipt of confirmation.

If you do not respond to this email, continuing your work may be significantly disrupted or may result in a break in employment.

Best regards,
FDK Legalization Team`,
    },
    ru: {
      subject: "Информация об истекающем документе легализации",
      body: `Добрый день,

Сообщаем, что срок действия Вашего документа ${typDokumentu} истекает ${dataWygasniecia}.

Если Вы заинтересованы в дальнейшем выполнении работы для Fundacja Firma Dla Każdego, просим направить подтверждение по электронной почте на адрес legalizacja@firmadlakazdego.pl. Дальнейшие шаги по получению нового документа будут сообщены после получения подтверждения.

В случае отсутствия ответа на данное письмо продолжение работы может быть значительно затруднено или может привести к перерыву в трудоустройстве.

С уважением,
Отдел легализации FDK`,
    },
  };
  return templates[lang] ?? templates.pl;
}

function getResidencePermitEmail(lang: Lang, typDokumentu: string, dataWygasniecia: string) {
  const templates: Record<Lang, { subject: string; body: string }> = {
    pl: {
      subject: "PILNE — kończący się dokument pobytowy",
      body: `Dzień dobry,

Informujemy, że ważność Pana/i dokumentu pobytowego ${typDokumentu} upływa w dniu ${dataWygasniecia}.

Prosimy o pilne przesłanie nowego dokumentu pobytowego na adres legalizacja@firmadlakazdego.pl (skan stempla w paszporcie, skan nowej decyzji pobytowej, pocztowe potwierdzenia przesłania wniosku do urzędu, skan innego dokumentu potwierdzającego postępowanie pobytowe np. wezwanie).

W przypadku braku odpowiedzi na tego maila, kontynuowanie pracy nie będzie możliwe.

Pozdrawiamy
Zespół Legalizacji FDK`,
    },
    en: {
      subject: "URGENT — Expiring residence document",
      body: `Good morning,

We would like to inform you that your residence permit ${typDokumentu} expires on ${dataWygasniecia}.

Please urgently send your new residence document to legalizacja@firmadlakazdego.pl (a scan of the stamp in your passport, a scan of your new residence decision, postal confirmation of sending the application to the office, a scan of another document confirming the residence procedure, e.g., a letter from office).

If we do not receive a response to this email, it will not be possible to continue working.

Best regards,
FDK Legalization Team`,
    },
    ru: {
      subject: "СРОЧНО — истекающий документ на пребывание",
      body: `Добрый день,

Сообщаем, что срок действия Вашего документа, подтверждающего право на пребывание ${typDokumentu}, истекает ${dataWygasniecia}.

Просим срочно направить новый документ, подтверждающий право на пребывание, на адрес legalizacja@firmadlakazdego.pl (скан штампа в паспорте, скан нового решения о предоставлении вида на жительство, почтовое подтверждение отправки заявления в ужонд, скан иного документа, подтверждающего рассмотрение дела о пребывании, например, уведомление/вызов).

В случае отсутствия ответа на данное письмо продолжение работы будет невозможно.

С уважением,
Отдел легализации FDK`,
    },
  };
  return templates[lang] ?? templates.pl;
}

function getDocTypeLabel(typ: string, lang: Lang): string {
  const labels: Record<string, Record<Lang, string>> = {
    ZEZWOLENIE: { pl: "zezwolenia na pracę", en: "work permit", ru: "разрешения на работу" },
    OSWIADCZENIE: { pl: "oświadczenia o powierzeniu pracy", en: "employer's declaration", ru: "заявления о поручении работы" },
    BLUE_CARD: { pl: "Blue Card", en: "Blue Card", ru: "Blue Card" },
    KARTA_POBYTU: { pl: "zezwolenia na pobyt czasowy i pracę", en: "temporary residence and work permit", ru: "разрешения на временное пребывание и работу" },
  };
  return labels[typ]?.[lang] ?? labels[typ]?.pl ?? typ;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) {
    return NextResponse.json({ message: "No RESEND_API_KEY configured", sent: 0 });
  }

  // Get notification settings
  let settings = await db.notificationSettings.findFirst({ where: { id: 1 } });
  if (!settings) {
    settings = await db.notificationSettings.create({
      data: { id: 1, teamNotifyFrequencyDays: 14, oswiadczenieDaysBefore: 45, zezwolenieDaysBefore: 240, pobytDaysBefore: 60 },
    });
  }

  const now = new Date();
  const cooldownDate = new Date(now.getTime() - RESEND_COOLDOWN_DAYS * 86400000);

  // Fetch recent notification logs to avoid duplicates
  const recentLogs = await db.fdkNotificationLog.findMany({
    where: { sentAt: { gte: cooldownDate } },
    select: { foreignerId: true, typ: true },
  });
  const sentSet = new Set(recentLogs.map((l) => `${l.foreignerId}_${l.typ}`));

  // Fetch all foreigners with employment bases and email
  const foreigners = await db.fdkForeigner.findMany({
    where: { email: { not: null } },
    include: {
      employmentBases: {
        where: { dataDo: { not: null }, status: { in: ["AKTYWNE", "W_TRAKCIE"] } },
      },
    },
  });

  let sentCount = 0;
  const errors: string[] = [];

  for (const f of foreigners) {
    if (!f.email) continue;

    const lang = (f.jezykPreferowany === "en" || f.jezykPreferowany === "ru") ? f.jezykPreferowany as Lang : "pl";

    const hasResidencePermit =
      (f.decyzjaPobytowaDo && f.decyzjaPobytowaDo > now) ||
      f.employmentBases.some((b) => b.typ === "KARTA_POBYTU" && b.dataDo && b.dataDo > now);

    for (const base of f.employmentBases) {
      if (!base.dataDo) continue;
      const daysLeft = Math.ceil((base.dataDo.getTime() - now.getTime()) / 86400000);
      if (daysLeft < 0) continue;

      const dateStr = base.dataDo.toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL");

      if ((base.typ === "ZEZWOLENIE" || base.typ === "OSWIADCZENIE" || base.typ === "BLUE_CARD") && !hasResidencePermit) {
        const threshold = base.typ === "OSWIADCZENIE" ? settings.oswiadczenieDaysBefore : settings.zezwolenieDaysBefore;
        if (daysLeft > threshold) continue;

        const notifType = base.typ === "OSWIADCZENIE" ? "expiry_osw" : "expiry_wp";
        const key = `${f.id}_${notifType}`;
        if (sentSet.has(key)) continue;

        const docLabel = getDocTypeLabel(base.typ, lang);
        const { subject, body } = getWorkPermitEmail(lang, docLabel, dateStr);

        try {
          await resend.emails.send({ from: FROM, to: f.email, subject, text: body });
          await db.fdkNotificationLog.create({ data: { foreignerId: f.id, typ: notifType, email: f.email } });
          sentSet.add(key);
          sentCount++;
        } catch (err) {
          errors.push(`Failed to send to ${f.email}: ${err}`);
        }
      }

      if (base.typ === "KARTA_POBYTU") {
        if (daysLeft > settings.pobytDaysBefore) continue;

        const key = `${f.id}_expiry_pobyt`;
        if (sentSet.has(key)) continue;

        const docLabel = getDocTypeLabel(base.typ, lang);
        const { subject, body } = getResidencePermitEmail(lang, docLabel, dateStr);

        try {
          await resend.emails.send({ from: FROM, to: f.email, subject, text: body });
          await db.fdkNotificationLog.create({ data: { foreignerId: f.id, typ: "expiry_pobyt", email: f.email } });
          sentSet.add(key);
          sentCount++;
        } catch (err) {
          errors.push(`Failed to send to ${f.email}: ${err}`);
        }
      }
    }

    // Check decyzjaPobytowaDo field directly
    if (f.decyzjaPobytowaDo) {
      const daysLeft = Math.ceil((f.decyzjaPobytowaDo.getTime() - now.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= settings.pobytDaysBefore) {
        const key = `${f.id}_expiry_pobyt`;
        if (!sentSet.has(key)) {
          const dateStr = f.decyzjaPobytowaDo.toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL");
          const docLabel = f.typDokumentuPobytowego ?? getDocTypeLabel("KARTA_POBYTU", lang);
          const { subject, body } = getResidencePermitEmail(lang, docLabel, dateStr);

          try {
            await resend.emails.send({ from: FROM, to: f.email, subject, text: body });
            await db.fdkNotificationLog.create({ data: { foreignerId: f.id, typ: "expiry_pobyt", email: f.email } });
            sentSet.add(key);
            sentCount++;
          } catch (err) {
            errors.push(`Failed to send to ${f.email}: ${err}`);
          }
        }
      }
    }
  }

  return NextResponse.json({
    message: `Sent ${sentCount} foreigner notifications`,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
