import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  await requireAdmin();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { userId, amountPln } = body as { userId?: string; amountPln?: number };

  if (!userId || typeof amountPln !== "number" || amountPln < 0) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const amountGrosze = Math.round(amountPln * 100);

  await db.userAgreement.upsert({
    where: { userId },
    create: { userId, amount: amountGrosze },
    update: { amount: amountGrosze },
  });

  return NextResponse.json({ ok: true, amountGrosze });
}
