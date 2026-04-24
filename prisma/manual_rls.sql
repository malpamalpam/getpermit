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

-- =============================================================================
-- FDK TABLES — RLS (dane osobowe cudzoziemców — tylko staff/admin)
-- =============================================================================

ALTER TABLE public.fdk_foreigners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_employment_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_hr_monthly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_detailed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdk_permits ENABLE ROW LEVEL SECURITY;

-- FDK Foreigners
CREATE POLICY "fdk_foreigners_select_staff" ON public.fdk_foreigners FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_foreigners_insert_admin" ON public.fdk_foreigners FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_foreigners_update_admin" ON public.fdk_foreigners FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "fdk_foreigners_delete_admin" ON public.fdk_foreigners FOR DELETE USING (public.is_admin());

-- FDK Employment Bases
CREATE POLICY "fdk_bases_select_staff" ON public.fdk_employment_bases FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_bases_insert_admin" ON public.fdk_employment_bases FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_bases_update_admin" ON public.fdk_employment_bases FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "fdk_bases_delete_admin" ON public.fdk_employment_bases FOR DELETE USING (public.is_admin());

-- FDK HR Contracts
CREATE POLICY "fdk_hr_select_staff" ON public.fdk_hr_contracts FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_hr_insert_admin" ON public.fdk_hr_contracts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_hr_update_admin" ON public.fdk_hr_contracts FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "fdk_hr_delete_admin" ON public.fdk_hr_contracts FOR DELETE USING (public.is_admin());

-- FDK HR Monthly Entries
CREATE POLICY "fdk_monthly_select_staff" ON public.fdk_hr_monthly_entries FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_monthly_insert_admin" ON public.fdk_hr_monthly_entries FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_monthly_update_admin" ON public.fdk_hr_monthly_entries FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- FDK Detailed Documents
CREATE POLICY "fdk_docs_select_staff" ON public.fdk_detailed_documents FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_docs_insert_admin" ON public.fdk_detailed_documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_docs_delete_admin" ON public.fdk_detailed_documents FOR DELETE USING (public.is_admin());

-- FDK Attachments
CREATE POLICY "fdk_att_select_staff" ON public.fdk_attachments FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_att_insert_admin" ON public.fdk_attachments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fdk_att_delete_admin" ON public.fdk_attachments FOR DELETE USING (public.is_admin());

-- FDK Change Logs (audit — read by staff, write by service role only)
CREATE POLICY "fdk_changelog_select_staff" ON public.fdk_change_logs FOR SELECT USING (public.is_staff());

-- FDK Notification Logs (read by staff, write by service role only)
CREATE POLICY "fdk_notiflog_select_staff" ON public.fdk_notification_logs FOR SELECT USING (public.is_staff());

-- FDK Permits (legacy)
CREATE POLICY "fdk_permits_select_staff" ON public.fdk_permits FOR SELECT USING (public.is_staff());
CREATE POLICY "fdk_permits_insert_admin" ON public.fdk_permits FOR INSERT WITH CHECK (public.is_admin());

-- =============================================================================
-- CALENDAR EVENTS — staff/admin only
-- =============================================================================

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events_select_staff" ON public.calendar_events FOR SELECT USING (public.is_staff());
CREATE POLICY "calendar_events_insert_staff" ON public.calendar_events FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "calendar_events_update_staff" ON public.calendar_events FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "calendar_events_delete_admin" ON public.calendar_events FOR DELETE USING (public.is_admin());

-- =============================================================================
-- NOTIFICATION SETTINGS — admin only
-- =============================================================================

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_settings_select_admin" ON public.notification_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "notif_settings_update_admin" ON public.notification_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "notif_settings_insert_admin" ON public.notification_settings FOR INSERT WITH CHECK (public.is_admin());
