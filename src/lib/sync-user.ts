import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { User } from "@prisma/client";

/**
 * Synchronizuje rekord public.users z auth.users.
 *
 * Wywoływane po udanym callback magic linka. Tworzy nowego klienta przy pierwszym
 * logowaniu (rola CLIENT) lub aktualizuje istniejącego (lastLoginAt, locale).
 *
 * Wymaga service-role key — omija RLS.
 */
export async function syncUserFromAuth(
  authUserId: string,
  email: string,
  locale: string
): Promise<User> {
  const existing = await db.user.findUnique({
    where: { id: authUserId },
  });

  if (existing) {
    const updated = await db.user.update({
      where: { id: authUserId },
      data: {
        lastLoginAt: new Date(),
        // Nie nadpisuj locale — klient mógł go zmienić w ustawieniach panelu.
        // Ustawiaj locale tylko przy pierwszym logowaniu (patrz create poniżej).
      },
    });

    // Synchronizuj rolę do app_metadata przy każdym logowaniu, żeby JWT
    // odzwierciedlał aktualną rolę z public.users (np. po awansie z CLIENT
    // na STAFF/ADMIN).
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(authUserId, {
      app_metadata: { role: updated.role },
    });

    return updated;
  }

  // Pierwszy login — utwórz klienta
  const created = await db.user.create({
    data: {
      id: authUserId,
      email,
      role: "CLIENT",
      locale,
      lastLoginAt: new Date(),
    },
  });

  // Skopiuj rolę do app_metadata, żeby middleware mógł szybko sprawdzić
  // bez zapytania do DB.
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUserId, {
    app_metadata: { role: created.role },
  });

  return created;
}
