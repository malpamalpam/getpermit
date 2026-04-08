import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CaseStatus } from "@prisma/client";

/**
 * Anonimizuje sprawy zamknięte > 5 lat. Zachowuje statystyki (status, type),
 * usuwa PII (title, description, dane klienta jeśli ostatnia sprawa) i pliki
 * ze Storage. Zaplanowane jako Vercel Cron — odpalane raz dziennie.
 *
 * Wywołanie:
 *   GET /api/cron/anonymize-old-cases
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Vercel automatycznie ustawia ten nagłówek dla zaplanowanych jobów.
 * Lokalnie można testować z curl:
 *   curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/anonymize-old-cases
 */

const RETENTION_YEARS = 5;
const CLOSED_STATUSES: CaseStatus[] = [
  CaseStatus.DECISION_POSITIVE,
  CaseStatus.DECISION_NEGATIVE,
];

export async function GET(request: NextRequest) {
  // Auth: bearer token z env var
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

  // Znajdź sprawy zamknięte i niezmieniane od `cutoff`
  const oldCases = await db.case.findMany({
    where: {
      status: { in: CLOSED_STATUSES },
      updatedAt: { lt: cutoff },
      // Nie anonimizuj jeszcze raz tych, które już są zanonimizowane
      NOT: { title: { startsWith: "[ANONYMIZED]" } },
    },
    include: { documents: true },
  });

  if (oldCases.length === 0) {
    return NextResponse.json({ ok: true, anonymized: 0 });
  }

  const supabase = createSupabaseAdminClient();
  let anonymized = 0;

  for (const c of oldCases) {
    // Usuń pliki z Supabase Storage
    if (c.documents.length > 0) {
      await supabase.storage
        .from("case-documents")
        .remove(c.documents.map((d) => d.storagePath));
    }

    // Anonimizuj rekord sprawy + skasuj eventy i dokumenty
    await db.$transaction([
      db.caseEvent.deleteMany({ where: { caseId: c.id } }),
      db.document.deleteMany({ where: { caseId: c.id } }),
      db.case.update({
        where: { id: c.id },
        data: {
          title: "[ANONYMIZED]",
          description: null,
        },
      }),
    ]);

    anonymized += 1;
  }

  // TODO(v2): jeśli klient nie ma już żadnych spraw, anonimizuj też user-a
  // (firstName/lastName/phone → null, email → "anon-{uuid}@deleted.local")

  return NextResponse.json({
    ok: true,
    anonymized,
    cutoff: cutoff.toISOString(),
  });
}
