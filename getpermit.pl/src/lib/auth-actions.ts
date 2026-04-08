"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { routing } from "@/i18n/routing";

const emailSchema = z.string().email();

export type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "send_failed" };

/**
 * Wysyła magic link na podany email przez Supabase Auth.
 * Email-template jest skonfigurowany w Supabase Dashboard → Authentication → Email Templates.
 * Provider SMTP (Resend) skonfigurowany w Authentication → SMTP Settings.
 */
export async function sendMagicLink(
  email: string,
  locale: string,
  next?: string
): Promise<SendMagicLinkResult> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }

  const supabase = await createSupabaseServerClient();

  const callbackUrl = new URL("/api/auth/callback", siteConfig.url);
  callbackUrl.searchParams.set("locale", locale);
  if (next) callbackUrl.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      // shouldCreateUser=true (domyślne) — pierwsze logowanie tworzy auth user.
      // Sync z public.users dzieje się w callback handlerze.
    },
  });

  if (error) {
    console.error("[sendMagicLink] Supabase error:", error.message);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}

/**
 * Wylogowuje użytkownika i przekierowuje na stronę logowania.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/panel/login");
}

const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  locale: z.enum(routing.locales),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Aktualizuje profil zalogowanego użytkownika (firstName, lastName, phone, locale).
 */
export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale: string;
}): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        firstName: parsed.data.firstName || null,
        lastName: parsed.data.lastName || null,
        phone: parsed.data.phone || null,
        locale: parsed.data.locale,
      },
    });
  } catch (e) {
    console.error("[updateProfile] DB error:", e);
    return { ok: false, error: "db_error" };
  }

  revalidatePath("/panel/ustawienia");
  revalidatePath("/panel");
  return { ok: true };
}
