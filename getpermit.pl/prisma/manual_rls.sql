-- =============================================================================
-- Row-Level Security policies dla panelu klienta getpermit.pl
-- =============================================================================
-- Uruchamiać w Supabase SQL Editor PO udanej `prisma migrate dev --name init`.
-- Plik nie jest zarządzany przez Prisma migracje (Prisma nie wspiera RLS DDL).
--
-- Założenia:
-- - users.id == auth.uid() (UUID synchronizowany przy callback magic linka)
-- - rola jest trzymana w public.users.role (nie w JWT) — sprawdzamy przez
--   pomocniczą funkcję is_staff() / is_admin()
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helper: czy aktualny użytkownik jest staff/admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('STAFF', 'ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Klient widzi tylko swój wpis; staff/admin widzą wszystkich
CREATE POLICY "users_select_self_or_staff"
  ON public.users
  FOR SELECT
  USING (id = auth.uid() OR public.is_staff());

-- Klient może aktualizować tylko swoje dane (firstName, lastName, phone, locale);
-- staff/admin mogą aktualizować wszystkich
CREATE POLICY "users_update_self_or_staff"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid() OR public.is_staff())
  WITH CHECK (id = auth.uid() OR public.is_staff());

-- Tylko staff/admin mogą tworzyć użytkowników z panelu admina.
-- (Self-signup obsługuje server route po stronie aplikacji z service-role key.)
CREATE POLICY "users_insert_staff"
  ON public.users
  FOR INSERT
  WITH CHECK (public.is_staff());

-- Usuwanie — tylko admin
CREATE POLICY "users_delete_admin"
  ON public.users
  FOR DELETE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- CASES
-- ----------------------------------------------------------------------------
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_select_owner_or_staff"
  ON public.cases
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "cases_insert_staff"
  ON public.cases
  FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "cases_update_staff"
  ON public.cases
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "cases_delete_admin"
  ON public.cases
  FOR DELETE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- CASE_EVENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_events_select_owner_or_staff"
  ON public.case_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_events.case_id
        AND (c.user_id = auth.uid() OR public.is_staff())
    )
  );

CREATE POLICY "case_events_insert_staff"
  ON public.case_events
  FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "case_events_update_staff"
  ON public.case_events
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "case_events_delete_admin"
  ON public.case_events
  FOR DELETE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- DOCUMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_owner_or_staff"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = documents.case_id
        AND (c.user_id = auth.uid() OR public.is_staff())
    )
  );

CREATE POLICY "documents_insert_staff"
  ON public.documents
  FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "documents_update_staff"
  ON public.documents
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "documents_delete_staff"
  ON public.documents
  FOR DELETE
  USING (public.is_staff());

-- ----------------------------------------------------------------------------
-- ACCESS_LOGS — append-only, nikt nie czyta z klienta
-- ----------------------------------------------------------------------------
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Tylko admin może czytać logi dostępu
CREATE POLICY "access_logs_select_admin"
  ON public.access_logs
  FOR SELECT
  USING (public.is_admin());

-- Logi piszemy z service-role (bypass RLS); nie zezwalamy na insert z anon/auth.
-- Brak polityki INSERT = brak dostępu (RLS deny by default).

-- =============================================================================
-- STORAGE POLICIES (bucket: case-documents)
-- =============================================================================
-- Załóż bucket w Supabase Dashboard → Storage → New bucket:
--   name: case-documents
--   public: false
-- Następnie uruchom poniższe polityki w SQL Editor:

-- Klient pobiera plik tylko jeśli należy do jego sprawy.
-- Konwencja ścieżki: case-documents/{caseId}/{documentId}-{fileName}
-- Sprawdzamy pierwszy segment ścieżki (caseId) przeciwko cases.user_id.

CREATE POLICY "storage_case_documents_select_owner_or_staff"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'case-documents'
    AND (
      public.is_staff()
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "storage_case_documents_insert_staff"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'case-documents' AND public.is_staff()
  );

CREATE POLICY "storage_case_documents_delete_staff"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'case-documents' AND public.is_staff()
  );
