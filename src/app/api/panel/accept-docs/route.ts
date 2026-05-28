import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { termsAccepted, privacyAccepted, contractAccepted } = body as {
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    contractAccepted?: boolean;
  };

  if (!termsAccepted || !privacyAccepted || !contractAccepted) {
    return NextResponse.json(
      { error: "All documents must be accepted" },
      { status: 400 }
    );
  }

  await db.userAgreement.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      termsAccepted: true,
      privacyAccepted: true,
      contractAccepted: true,
      acceptedAt: new Date(),
    },
    update: {
      termsAccepted: true,
      privacyAccepted: true,
      contractAccepted: true,
      acceptedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
