import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/fdk-cleanup
 * One-time cleanup of test data. Admin-only.
 * Body: { actions: ["delete_base_234", "clear_zakpracy_125"] }
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  const changedBy = user.email ?? user.id ?? "system";

  const body = await request.json();
  const actions: string[] = body.actions ?? [];
  const results: string[] = [];

  for (const action of actions) {
    try {
      if (action === "delete_base_234") {
        const base = await db.fdkEmploymentBase.findUnique({ where: { id: 234 } });
        if (base) {
          await db.fdkEmploymentBase.delete({ where: { id: 234 } });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: base.foreignerId,
              changedBy,
              field: "employment_base_delete",
              oldValue: null,
              newValue: "Usunieto smieciowa podstawe #234 (ODWOLANIE, dane testowe)",
            },
          });
          results.push("Deleted base #234");
        } else {
          results.push("Base #234 not found (already deleted?)");
        }
      }

      if (action === "clear_zakpracy_125") {
        const base = await db.fdkEmploymentBase.findUnique({ where: { id: 125 } });
        if (base) {
          await db.fdkEmploymentBase.update({
            where: { id: 125 },
            data: { dataZakPracy: null },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: base.foreignerId,
              changedBy,
              field: "employment_base_auto",
              oldValue: base.dataZakPracy?.toISOString().slice(0, 10) ?? null,
              newValue: "Wyczyszczono date zakonczenia pracy (dane testowe)",
            },
          });
          results.push("Cleared dataZakPracy on base #125");
        } else {
          results.push("Base #125 not found");
        }
      }
    } catch (err) {
      results.push(`Error on ${action}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
