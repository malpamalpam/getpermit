import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations";
import { siteConfig } from "@/config/site";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limiting na IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const rl = checkRateLimit(`contact:${ip}`, RATE_LIMITS.contact);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Honeypot check — silently succeed
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, phone, service, message } = parsed.data;
  const locale = (body as { locale?: string }).locale ?? "pl";

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO ?? siteConfig.contact.email;
  const from = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

  if (!apiKey) {
    // Dev mode — log to console instead of failing
    console.warn("[contact] RESEND_API_KEY not set. Form submission:", {
      name,
      email,
      phone,
      service,
      message,
      locale,
    });
    return NextResponse.json({ ok: true, dev: true });
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[getpermit.pl] Nowe zapytanie: ${service || "ogólne"} (${locale})`,
      html: `
        <h2>Nowe zapytanie ze strony getpermit.pl</h2>
        <p><strong>Imię:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>` : ""}
        ${service ? `<p><strong>Usługa:</strong> ${escapeHtml(service)}</p>` : ""}
        <p><strong>Język:</strong> ${escapeHtml(locale)}</p>
        <hr />
        <p><strong>Wiadomość:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
