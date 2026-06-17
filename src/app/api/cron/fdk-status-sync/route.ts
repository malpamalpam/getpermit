import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeStatus } from "@/lib/fdk-queries";

/**
 * Cron: synchronizes FdkEmploymentBase statuses based on dates.
 * Runs daily at 6:00 AM (before notification crons).
 *
 * Updates DB records whose computed status differs from stored status.
 * Preserves manual overrides: UCHYLONE, UMORZONE.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bases = await db.fdkEmploymentBase.findMany({
    where: {
      status: { notIn: ["UCHYLONE", "UMORZONE"] },
    },
    select: { id: true, status: true, dataOd: true, dataDo: true },
  });

  let updated = 0;

  for (const base of bases) {
    const computed = computeStatus(base);
    if (computed !== base.status) {
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { status: computed as never },
      });
      updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: bases.length,
    updated,
    timestamp: new Date().toISOString(),
  });
}
