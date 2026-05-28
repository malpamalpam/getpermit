import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturePayPalOrder } from "@/lib/paypal";
import { siteConfig } from "@/config/site";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token"); // PayPal appends ?token=ORDER_ID
  const userId = url.searchParams.get("userId");

  if (!token || !userId) {
    return NextResponse.redirect(`${siteConfig.url}/panel/dokumenty?payment=error`);
  }

  try {
    const { status, captureId } = await capturePayPalOrder(token);

    if (status === "COMPLETED") {
      await db.userAgreement.update({
        where: { userId },
        data: {
          paymentStatus: "paid",
          paypalCaptureId: captureId,
          paidAt: new Date(),
        },
      });

      return NextResponse.redirect(`${siteConfig.url}/panel?payment=success`);
    }

    console.error("[paypal] Capture status not COMPLETED:", status);
    return NextResponse.redirect(`${siteConfig.url}/panel/dokumenty?payment=error`);
  } catch (err) {
    console.error("[paypal] Capture error:", err);
    return NextResponse.redirect(`${siteConfig.url}/panel/dokumenty?payment=error`);
  }
}
