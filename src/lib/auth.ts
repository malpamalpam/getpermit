import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { Role, User } from "@prisma/client";

/**
 * Pobiera bieżącą sesję Supabase + zsynchronizowanego użytkownika z bazy.
 * Zwraca null, jeśli nie zalogowany lub user jeszcze nie ma rekordu w public.users.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await db.user.findUnique({
    where: { id: authUser.id },
  });

  return dbUser;
}

/**
 * Wymaga zalogowanego użytkownika (dowolnej roli). Redirect do /panel/login,
 * jeśli brak sesji.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/panel/login");
  return user;
}

/**
 * Wymaga roli STAFF lub ADMIN. Redirect do /panel (klient) lub /panel/login (anon).
 */
export async function requireStaff(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/panel/login");
  if (user.role !== "STAFF" && user.role !== "ADMIN") {
    redirect("/panel");
  }
  return user;
}

/**
 * Wymaga roli ADMIN. Redirect do /panel/login lub /panel.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/panel/login");
  if (user.role !== "ADMIN") {
    redirect("/panel");
  }
  return user;
}

/**
 * Sprawdza czy user ma daną rolę (bez redirect).
 */
export function hasRole(user: User | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
