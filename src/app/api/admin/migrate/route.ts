import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/migrate
 * Add missing enum values directly via SQL.
 * Admin-only. Safe to run multiple times (IF NOT EXISTS equivalent).
 */
export async function POST(request: NextRequest) {
  await requireAdmin();

  const results: string[] = [];

  try {
    // Check current enum values
    const currentValues = await db.$queryRawUnsafe<{ unnest: string }[]>(
      `SELECT unnest(enum_range(NULL::"FdkStatus"))::text as unnest`
    );
    const existing = currentValues.map((r) => r.unnest);
    results.push(`Current FdkStatus values: ${existing.join(", ")}`);

    // Add NIEAKTYWNE if missing
    if (!existing.includes("NIEAKTYWNE")) {
      await db.$executeRawUnsafe(`ALTER TYPE "FdkStatus" ADD VALUE 'NIEAKTYWNE'`);
      results.push("Added NIEAKTYWNE to FdkStatus enum");
    } else {
      results.push("NIEAKTYWNE already exists in FdkStatus");
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[migrate] failed:", msg);
    results.push(`Error: ${msg}`);
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 });
  }
}
