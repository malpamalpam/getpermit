import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * POST /api/admin/migrate
 * Run `prisma migrate deploy` on the production database.
 * Admin-only. Use when migrations are pending after deploy.
 */
export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy", {
      timeout: 30000,
      env: { ...process.env },
    });

    console.log("[migrate] stdout:", stdout);
    if (stderr) console.warn("[migrate] stderr:", stderr);

    return NextResponse.json({
      ok: true,
      output: stdout,
      warnings: stderr || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[migrate] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
