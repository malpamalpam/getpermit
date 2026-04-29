import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

/**
 * Cron: sends HTML email notification for FDK permits/declarations expiring
 * within configured thresholds.
 *
 * Frequency: configurable (default: every 14 days).
 * Logic:
 *  - If foreigner has active residence permit (decyzja pobytowa) → skip WP/OŚW notifications
 *  - Separate tables for WP (zezwolenia) and OŚW (oświadczenia)
 *  - Also notifies about expiring residence permits/visas
 *
 * Vercel Cron — runs daily at 7:00 AM, but only sends email per configured frequency.
 */

const NOTIFY_EMAIL = "legalizacja@firmadlakazdego.pl";
const FROM = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get notification settings
  let settings = await db.notificationSettings.findFirst({ where: { id: 1 } });
  if (!settings) {
    settings = await db.notificationSettings.create({
      data: {
        id: 1,
        teamNotifyFrequencyDays: 14,
        oswiadczenieDaysBefore: 45,
        zezwolenieDaysBefore: 240,
        pobytDaysBefore: 60,
      },
    });
  }

  // Check if enough time has passed since last notification
  const now = new Date();
  if (settings.lastTeamNotifySentAt) {
    const daysSinceLast = Math.floor(
      (now.getTime() - settings.lastTeamNotifySentAt.getTime()) / 86400000
    );
    if (daysSinceLast < settings.teamNotifyFrequencyDays) {
      return NextResponse.json({
        message: `Skipped — last sent ${daysSinceLast} days ago, frequency is ${settings.teamNotifyFrequencyDays} days`,
        nextSendIn: settings.teamNotifyFrequencyDays - daysSinceLast,
      });
    }
  }

  // Find all foreigners with their employment bases
  const foreigners = await db.fdkForeigner.findMany({
    include: {
      employmentBases: {
        where: {
          dataDo: { not: null },
          status: { in: ["AKTYWNE", "W_TRAKCIE"] },
        },
        orderBy: { dataDo: "asc" },
      },
    },
  });

  type ExpiryRow = {
    imie: string;
    nazwisko: string;
    typ: string;
    typLabel: string;
    dataDo: Date;
    daysLeft: number;
  };

  const expiringWP: ExpiryRow[] = [];
  const expiringOSW: ExpiryRow[] = [];
  const expiringPobyt: ExpiryRow[] = [];

  for (const f of foreigners) {
    // Check if foreigner has active residence permit
    const hasResidencePermit =
      (f.decyzjaPobytowaDo && f.decyzjaPobytowaDo > now) ||
      f.employmentBases.some(
        (b) => b.typ === "KARTA_POBYTU" && b.dataDo && b.dataDo > now
      );

    for (const base of f.employmentBases) {
      if (!base.dataDo) continue;
      const daysLeft = Math.ceil((base.dataDo.getTime() - now.getTime()) / 86400000);
      if (daysLeft < 0) continue;

      const row: ExpiryRow = {
        imie: f.imie ?? "",
        nazwisko: f.nazwisko,
        typ: base.typ,
        typLabel: "",
        dataDo: base.dataDo,
        daysLeft,
      };

      if (base.typ === "ZEZWOLENIE" || base.typ === "BLUE_CARD") {
        // Skip WP notifications if person has active residence permit
        if (hasResidencePermit) continue;
        if (daysLeft > settings.zezwolenieDaysBefore) continue;
        row.typLabel = base.typ === "BLUE_CARD" ? "Blue Card" : "Zezwolenie na pracę";
        expiringWP.push(row);
      } else if (base.typ === "OSWIADCZENIE") {
        // Skip OŚW notifications if person has active residence permit
        if (hasResidencePermit) continue;
        if (daysLeft > settings.oswiadczenieDaysBefore) continue;
        row.typLabel = "Oświadczenie";
        expiringOSW.push(row);
      } else if (base.typ === "KARTA_POBYTU") {
        if (daysLeft > settings.pobytDaysBefore) continue;
        row.typLabel = "Karta pobytu (zezw. na pobyt)";
        expiringPobyt.push(row);
      } else if (base.typ === "ZGLOSZENIE_UA") {
        if (hasResidencePermit) continue;
        if (daysLeft > settings.oswiadczenieDaysBefore) continue;
        row.typLabel = "Zgłoszenie UA (powiadomienie)";
        expiringOSW.push(row);
      }
    }

    // Check decyzjaPobytowaDo field directly
    if (f.decyzjaPobytowaDo) {
      const daysLeft = Math.ceil((f.decyzjaPobytowaDo.getTime() - now.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= settings.pobytDaysBefore) {
        // Avoid duplicate if already counted from employment bases
        const alreadyCounted = expiringPobyt.some(
          (r) => r.nazwisko === f.nazwisko && r.imie === (f.imie ?? "")
        );
        if (!alreadyCounted) {
          expiringPobyt.push({
            imie: f.imie ?? "",
            nazwisko: f.nazwisko,
            typ: "DECYZJA_POBYTOWA",
            typLabel: f.typDokumentuPobytowego
              ? `Dokument pobytowy: ${f.typDokumentuPobytowego}`
              : "Decyzja pobytowa (typ nieznany)",
            dataDo: f.decyzjaPobytowaDo,
            daysLeft,
          });
        }
      }
    }
  }

  const totalExpiring = expiringWP.length + expiringOSW.length + expiringPobyt.length;

  if (totalExpiring === 0) {
    // Still update last sent date so we don't check too often
    await db.notificationSettings.update({
      where: { id: 1 },
      data: { lastTeamNotifySentAt: now },
    });
    return NextResponse.json({ message: "No expiring documents", count: 0 });
  }

  // Build HTML email with tables
  const tableStyle = `style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;margin-bottom:24px;"`;
  const thStyle = `style="padding:8px 12px;background:#f0f4f8;border:1px solid #d0d7de;text-align:left;font-weight:600;color:#24292f;"`;
  const tdStyle = `style="padding:8px 12px;border:1px solid #d0d7de;color:#24292f;"`;
  const tdWarnStyle = `style="padding:8px 12px;border:1px solid #d0d7de;color:#cf222e;font-weight:600;"`;

  function buildTable(title: string, rows: ExpiryRow[]): string {
    if (rows.length === 0) return "";
    const header = `<h3 style="font-family:Arial,sans-serif;color:#24292f;margin-bottom:8px;">${title} (${rows.length})</h3>`;
    const tableRows = rows
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .map(
        (r) =>
          `<tr><td ${tdStyle}>${r.imie} ${r.nazwisko}</td><td ${tdStyle}>${r.typLabel}</td><td ${tdStyle}>${r.dataDo.toISOString().slice(0, 10)}</td><td ${r.daysLeft <= 14 ? tdWarnStyle : tdStyle}>${r.daysLeft} dni</td></tr>`
      )
      .join("");
    return `${header}<table ${tableStyle}><thead><tr><th ${thStyle}>Imię i nazwisko</th><th ${thStyle}>Typ dokumentu</th><th ${thStyle}>Data ważności</th><th ${thStyle}>Dni do wygaśnięcia</th></tr></thead><tbody>${tableRows}</tbody></table>`;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
      <h2 style="color:#24292f;">Powiadomienie o kończących się dokumentach</h2>
      <p style="color:#57606a;">Łącznie: ${totalExpiring} dokumentów wymaga uwagi.</p>
      ${buildTable("Zezwolenia na pracę", expiringWP)}
      ${buildTable("Oświadczenia", expiringOSW)}
      ${buildTable("Dokumenty pobytowe / wizy", expiringPobyt)}
      <p style="margin-top:24px;font-size:12px;color:#8b949e;">— System getpermit.pl | Częstotliwość: co ${settings.teamNotifyFrequencyDays} dni</p>
    </div>
  `;

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  if (resend) {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY_EMAIL,
      subject: `[FDK] ${totalExpiring} dokumentów wygasa — podsumowanie`,
      html,
    });
  } else {
    console.log("[FDK Cron] No RESEND_API_KEY, logging email body length:", html.length);
  }

  // Update last sent date
  await db.notificationSettings.update({
    where: { id: 1 },
    data: { lastTeamNotifySentAt: now },
  });

  return NextResponse.json({
    message: `Notification sent: ${expiringWP.length} WP, ${expiringOSW.length} OŚW, ${expiringPobyt.length} pobyt`,
    count: totalExpiring,
  });
}
