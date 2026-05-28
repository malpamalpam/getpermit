import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST() {
  const user = await requireUser();

  const agreement = await db.userAgreement.findUnique({
    where: { userId: user.id },
  });

  if (!agreement?.termsAccepted || !agreement.privacyAccepted || !agreement.contractAccepted) {
    return NextResponse.json(
      { error: "Documents must be accepted before payment" },
      { status: 400 }
    );
  }

  if (agreement.paymentStatus === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const amountGrosze = agreement.amount > 0 ? agreement.amount : 0;
  if (amountGrosze <= 0) {
    return NextResponse.json(
      { error: "Service price not set. Please contact us at " + siteConfig.contact.email },
      { status: 400 }
    );
  }

  const amountPln = (amountGrosze / 100).toFixed(2);

  try {
    const { orderId, approveUrl } = await createPayPalOrder({
      amountPln,
      description: `Usługi legalizacyjne — getpermit.pl (${user.email})`,
      userId: user.id,
      returnUrl: `${siteConfig.url}/api/paypal/capture?userId=${user.id}`,
      cancelUrl: `${siteConfig.url}/panel/dokumenty?payment=cancelled`,
    });

    await db.userAgreement.update({
      where: { userId: user.id },
      data: { paypalOrderId: orderId, paymentStatus: "pending" },
    });

    return NextResponse.json({ url: approveUrl });
  } catch (err) {
    console.error("[paypal] create order error:", err);
    return NextResponse.json({ error: "PayPal error" }, { status: 500 });
  }
}
