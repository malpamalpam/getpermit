"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { routing } from "@/i18n/routing";
import { syncUserFromAuth } from "@/lib/sync-user";

/* ============================================================================ */
/*                              REJESTRACJA                                     */
/* ============================================================================ */

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z.literal(true),
  terms: z.literal(true),
});

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "validation" | "email_taken" | "weak_password" | "general" };

export async function registerAction(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  consent: boolean;
  terms: boolean;
  locale: string;
}): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const supabase = await createSupabaseServerClient();

  const callbackUrl = new URL("/api/auth/callback", siteConfig.url);
  callbackUrl.searchParams.set("locale", input.locale);
  callbackUrl.searchParams.set("next", "/panel");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
    },
  });

  if (error) {
    console.error("[register] Supabase error:", error.message);
    if (error.message.includes("already registered")) {
      return { ok: false, error: "email_taken" };
    }
    if (error.message.includes("password")) {
      return { ok: false, error: "weak_password" };
    }
    return { ok: false, error: "general" };
  }

  // Sync public.users — upsert by email (może istnieć z wcześniejszego flow)
  if (data.user) {
    const existingByEmail = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingByEmail) {
      await db.user.update({
        where: { email: parsed.data.email },
        data: {
          id: data.user.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          locale: input.locale,
        },
      });
    } else {
      await db.user.create({
        data: {
          id: data.user.id,
          email: parsed.data.email,
          role: "CLIENT",
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          locale: input.locale,
        },
      });
    }
  }

  return { ok: true };
}

/* ============================================================================ */
/*                              LOGOWANIE                                       */
/* ============================================================================ */

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "validation" | "invalid_credentials" | "general" };

export async function loginAction(input: {
  email: string;
  password: string;
  locale: string;
}): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("[login] Supabase error:", error.message);
    return { ok: false, error: "invalid_credentials" };
  }

  // Sync user przy logowaniu (aktualizuje lastLoginAt, rolę w app_metadata)
  if (data.user) {
    try {
      await syncUserFromAuth(data.user.id, data.user.email!, input.locale);
    } catch (e) {
      console.error("[login] sync failed:", e);
    }
  }

  return { ok: true };
}

/* ============================================================================ */
/*                          RESETOWANIE HASŁA                                   */
/* ============================================================================ */

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: "validation" | "general" };

export async function resetPasswordAction(input: {
  email: string;
  locale: string;
}): Promise<ResetPasswordResult> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const supabase = await createSupabaseServerClient();

  const callbackUrl = new URL("/api/auth/callback", siteConfig.url);
  callbackUrl.searchParams.set("locale", input.locale);
  callbackUrl.searchParams.set("next", "/panel");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    console.error("[resetPassword] Supabase error:", error.message);
    // Don't reveal whether the email exists
  }

  // Always return ok to prevent email enumeration
  return { ok: true };
}

/* ============================================================================ */
/*                              WYLOGOWANIE                                     */
/* ============================================================================ */

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/panel/login");
}

/* ============================================================================ */
/*                           AKTUALIZACJA PROFILU                               */
/* ============================================================================ */

const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  locale: z.enum(routing.locales),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

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
