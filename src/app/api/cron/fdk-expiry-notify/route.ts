import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

/**
 * Daily cron: sends email notification for FDK permits expiring within 30 days.
 * Target: legalizacja@firmadlakazdego.pl
 *
 * Vercel Cron — runs daily at 7:00 AM.
 */

const NOTIFY_EMAIL = "legalizacja@firmadlakazdego.pl";
const FROM = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);

  // Find permits expiring within 30 days that are still active
  const expiring = await db.fdkPermit.findMany({
    where: {
      dataDo: {
        gte: now,
        lte: thirtyDays,
      },
    },
    orderBy: { dataDo: "asc" },
  });

  if (expiring.length === 0) {
    return NextResponse.json({ message: "No expiring permits", count: 0 });
  }

  // Build email
  const rows = expiring.map((p) => {
    const daysLeft = Math.ceil(
      (new Date(p.dataDo!).getTime() - now.getTime()) / 86400000
    );
    const typ =
      p.typDokumentu === "ZEZWOLENIE"
        ? "Zezwolenie"
        : p.typDokumentu === "OSWIADCZENIE"
          ? "Oświadczenie"
          : "Blue Card";
    return `• ${p.nazwisko} ${p.imie} — ${typ} — wygasa ${p.dataDo!.toISOString().slice(0, 10)} (${daysLeft} dni)`;
  });

  const body = `Poniższe zezwolenia/oświadczenia wygasają w ciągu 30 dni:\n\n${rows.join("\n")}\n\nŁącznie: ${expiring.length} rekordów.\n\n— System getpermit.pl`;

  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  if (resend) {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY_EMAIL,
      subject: `[FDK] ${expiring.length} zezwoleń wygasa w ciągu 30 dni`,
      text: body,
    });
  } else {
    console.log("[FDK Cron] No RESEND_API_KEY, logging email:\n", body);
  }

  return NextResponse.json({
    message: `Notification sent for ${expiring.length} expiring permits`,
    count: expiring.length,
  });
}
