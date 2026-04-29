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
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { cookies, headers } from "next/headers";

async function getClientIp(): Promise<string> {
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return hdrs.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

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

  // Rate limiting na IP
  const ip = await getClientIp();
  const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.register);
  if (!rl.allowed) {
    return { ok: false, error: "general" };
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
  | { ok: true; redirect?: string }
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

  // Rate limiting na IP
  const ip = await getClientIp();
  const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
  if (!rl.allowed) {
    console.warn(`[login] Rate limited IP=${ip}, retry in ${rl.retryAfterSeconds}s`);
    return { ok: false, error: "general" };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("[login] Supabase error:", error.message);
    // Loguj nieudaną próbę
    void db.accessLog.create({
      data: {
        action: "VIEW_CASE", // reuse existing enum — closest match
        ipAddress: ip,
        metadata: { event: "login_failed", email: parsed.data.email },
      },
    }).catch(() => {});
    return { ok: false, error: "invalid_credentials" };
  }

  // Sync user przy logowaniu (aktualizuje lastLoginAt, rolę w app_metadata)
  let syncedUser;
  if (data.user) {
    try {
      syncedUser = await syncUserFromAuth(data.user.id, data.user.email!, input.locale);
    } catch (e) {
      console.error("[login] sync failed:", e);
    }
  }

  // Ustaw cookie NEXT_LOCALE na locale zapisany w profilu użytkownika,
  // aby panel wyświetlał się w preferowanym języku po zalogowaniu.
  if (syncedUser?.locale) {
    const cookieStore = await cookies();
    cookieStore.set("NEXT_LOCALE", syncedUser.locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }

  const isStaffOrAdmin = syncedUser && (syncedUser.role === "ADMIN" || syncedUser.role === "STAFF");
  return { ok: true, redirect: isStaffOrAdmin ? "/admin" : "/panel" };
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

  // Rate limiting na IP
  const ip = await getClientIp();
  const rl = checkRateLimit(`reset:${ip}`, RATE_LIMITS.resetPassword);
  if (!rl.allowed) {
    return { ok: true }; // nie ujawniaj rate limitu — zwróć "ok" jak zwykle
  }

  const supabase = await createSupabaseServerClient();

  const callbackUrl = new URL("/api/auth/callback", siteConfig.url);
  callbackUrl.searchParams.set("locale", input.locale);
  callbackUrl.searchParams.set("next", "/panel");

  const resetCallbackUrl = new URL("/api/auth/callback", siteConfig.url);
  resetCallbackUrl.searchParams.set("locale", input.locale);
  resetCallbackUrl.searchParams.set("next", "/panel/nowe-haslo");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: resetCallbackUrl.toString(),
  });

  if (error) {
    console.error("[resetPassword] Supabase error:", error.message);
    // Don't reveal whether the email exists
  }

  // Always return ok to prevent email enumeration
  return { ok: true };
}

/* ============================================================================ */
/*                          USTAWIENIE NOWEGO HASŁA                             */
/* ============================================================================ */

export type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; error: "validation" | "weak_password" | "general" };

export async function updatePasswordAction(input: {
  password: string;
}): Promise<UpdatePasswordResult> {
  const parsed = z.object({ password: z.string().min(8) }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[updatePassword] Supabase error:", error.message);
    if (error.message.includes("password")) {
      return { ok: false, error: "weak_password" };
    }
    return { ok: false, error: "general" };
  }

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

  // Ustaw cookie NEXT_LOCALE, aby middleware i layout od razu odzwierciedlały nowy język
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", parsed.data.locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  revalidatePath("/panel/ustawienia");
  revalidatePath("/panel");
  return { ok: true };
}
