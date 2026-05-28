import { NextResponse } from "next/server";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  // Rate limiting na IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const rl = checkRateLimit(`contact:${ip}`, RATE_LIMITS.contact);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const senderType = (formData.get("senderType") as string | null)?.trim() ?? "";
  const companyName = (formData.get("companyName") as string | null)?.trim() ?? "";
  const fullName = (formData.get("fullName") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const service = (formData.get("service") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  const website = (formData.get("website") as string | null) ?? "";
  const locale = (formData.get("locale") as string | null) ?? "pl";

  // Honeypot
  if (website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  // Basic validation
  if (!["firma", "cudzoziemiec"].includes(senderType)) {
    return NextResponse.json({ error: "validation", field: "senderType" }, { status: 400 });
  }
  if (senderType === "firma" && !companyName) {
    return NextResponse.json({ error: "validation", field: "companyName" }, { status: 400 });
  }
  if (senderType === "cudzoziemiec" && !fullName) {
    return NextResponse.json({ error: "validation", field: "fullName" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "validation", field: "email" }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "validation", field: "message" }, { status: 400 });
  }

  // Process file attachments
  const rawFiles = formData.getAll("attachments") as File[];
  const validFiles = rawFiles.filter(
    (f) => f instanceof File && f.size > 0
  ) as File[];

  for (const f of validFiles) {
    if (f.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file_too_large", name: f.name }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      return NextResponse.json({ error: "invalid_file_type", name: f.name }, { status: 400 });
    }
  }

  const senderLabel = senderType === "firma" ? "Firma" : "Cudzoziemiec";
  const senderDetail =
    senderType === "firma"
      ? `<p><strong>Nazwa firmy:</strong> ${escapeHtml(companyName)}</p>`
      : `<p><strong>Imię i nazwisko:</strong> ${escapeHtml(fullName)}</p>`;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO ?? siteConfig.contact.email;
  const from = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set. Form submission:", {
      senderType, companyName, fullName, email, phone, service, message, locale,
      attachments: validFiles.map((f) => f.name),
    });
    return NextResponse.json({ ok: true, dev: true });
  }

  // Convert files to Buffer for Resend
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const f of validFiles) {
    const buf = Buffer.from(await f.arrayBuffer());
    attachments.push({ filename: f.name, content: buf });
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[getpermit.pl] Nowe zapytanie: ${service || "ogólne"} (${locale}) — ${senderLabel}`,
      html: `
        <h2>Nowe zapytanie ze strony getpermit.pl</h2>
        <p><strong>Typ nadawcy:</strong> ${escapeHtml(senderLabel)}</p>
        ${senderDetail}
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>` : ""}
        ${service ? `<p><strong>Usługa:</strong> ${escapeHtml(service)}</p>` : ""}
        <p><strong>Język:</strong> ${escapeHtml(locale)}</p>
        ${attachments.length > 0 ? `<p><strong>Załączniki:</strong> ${attachments.map((a) => escapeHtml(a.filename)).join(", ")}</p>` : ""}
        <hr />
        <p><strong>Wiadomość:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      `,
      attachments,
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
