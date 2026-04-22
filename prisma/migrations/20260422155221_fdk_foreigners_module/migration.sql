-- CreateEnum
CREATE TYPE "FdkBaseType" AS ENUM ('ZEZWOLENIE', 'OSWIADCZENIE', 'KARTA_POBYTU', 'BLUE_CARD', 'ZGLOSZENIE_UA');

-- CreateEnum
CREATE TYPE "FdkStatus" AS ENUM ('AKTYWNE', 'WYGASLE', 'UCHYLONE', 'UMORZONE', 'ZAKONCZONE', 'W_TRAKCIE', 'BRAK_DANYCH');

-- CreateTable
CREATE TABLE "personal_data" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "biometric_photo" TEXT,
    "first_name_latin" TEXT,
    "last_name_latin" TEXT,
    "native_full_name" TEXT,
    "previous_name" TEXT,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "place_of_birth" TEXT,
    "country_of_birth" TEXT,
    "citizenship" TEXT,
    "second_citizenship" TEXT,
    "nationality" TEXT,
    "marital_status" TEXT,
    "education" TEXT,
    "height" INTEGER,
    "eye_color" TEXT,
    "special_features" TEXT,
    "father_name" TEXT,
    "mother_name" TEXT,
    "mother_maiden_name" TEXT,
    "passport_number" TEXT,
    "passport_series" TEXT,
    "passport_issue_date" TIMESTAMP(3),
    "passport_expiry_date" TIMESTAMP(3),
    "passport_issuing_authority" TEXT,
    "pesel" TEXT,
    "residence_card_number" TEXT,
    "residence_card_expiry" TIMESTAMP(3),
    "visa_number" TEXT,
    "visa_type" TEXT,
    "visa_expiry" TIMESTAMP(3),
    "street" TEXT,
    "house_number" TEXT,
    "apartment_number" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "voivodeship" TEXT,
    "registration_address" TEXT,
    "correspondence_address" TEXT,
    "phone_number" TEXT,
    "contact_email" TEXT,
    "additional_phone" TEXT,
    "preferred_language" TEXT,
    "first_entry_date" TIMESTAMP(3),
    "last_entry_date" TIMESTAMP(3),
    "purpose_of_stay" TEXT,
    "current_residence_title" TEXT,
    "pending_proceedings" BOOLEAN,
    "case_number_at_office" TEXT,
    "handling_office" TEXT,
    "criminal_record" BOOLEAN,
    "deportation_proceedings" BOOLEAN,
    "planned_stay_duration" TEXT,
    "occupation" TEXT,
    "employer_name" TEXT,
    "employer_street" TEXT,
    "employer_house_number" TEXT,
    "employer_apartment_number" TEXT,
    "employer_postal_code" TEXT,
    "employer_city" TEXT,
    "employer_phone" TEXT,
    "employer_email" TEXT,
    "contract_type" TEXT,
    "contract_from" TIMESTAMP(3),
    "contract_to" TIMESTAMP(3),
    "contract_indefinite" BOOLEAN,
    "salary" TEXT,
    "family_members_in_poland" TEXT,
    "last_entry_details" TEXT,
    "previous_visits_poland" TEXT,
    "travels_outside_poland" TEXT,
    "address_country_of_origin" TEXT,
    "previous_addresses_poland" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_permits" (
    "id" SERIAL NOT NULL,
    "nazwisko" TEXT NOT NULL,
    "imie" TEXT NOT NULL,
    "typ_dokumentu" TEXT NOT NULL,
    "data_od" TIMESTAMP(3),
    "data_do" TIMESTAMP(3),
    "decyzja_odebrana" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdk_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_foreigners" (
    "id" SERIAL NOT NULL,
    "nazwisko" TEXT NOT NULL,
    "imie" TEXT,
    "data_urodzenia" TIMESTAMP(3),
    "miejsce_urodzenia" TEXT,
    "obywatelstwo" TEXT,
    "plec" TEXT,
    "pesel" TEXT,
    "nr_paszportu" TEXT,
    "paszport_wazny_od" TIMESTAMP(3),
    "paszport_wazny_do" TIMESTAMP(3),
    "adres_pl" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "nr_konta" TEXT,
    "uwagi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdk_foreigners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_employment_bases" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "typ" "FdkBaseType" NOT NULL,
    "status" "FdkStatus" NOT NULL DEFAULT 'BRAK_DANYCH',
    "rodzaj_umowy" TEXT,
    "data_od" TIMESTAMP(3),
    "data_do" TIMESTAMP(3),
    "firma" TEXT,
    "nr_decyzji" TEXT,
    "wezwanie_braki" TEXT,
    "powiadomienie_do" TIMESTAMP(3),
    "uchylenie" TEXT,
    "start_info" TEXT,
    "nr_oswiadczenia" TEXT,
    "podjecie_pracy" TEXT,
    "urzad" TEXT,
    "rodzaj_sprawy" TEXT,
    "data_zlozenia" TIMESTAMP(3),
    "sposob_wysylki" TEXT,
    "sygnatura" TEXT,
    "brakujace_dokumenty" TEXT,
    "uwagi_kp" TEXT,
    "decyzja_odebrana" TIMESTAMP(3),
    "stanowisko" TEXT,
    "stawka" DECIMAL(12,2),
    "data_podjecia" TIMESTAMP(3),
    "uwagi_ua" TEXT,
    "uwagi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdk_employment_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_hr_contracts" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "rok" INTEGER NOT NULL,
    "data_od" TIMESTAMP(3),
    "data_do" TIMESTAMP(3),
    "rodzaj_umowy" TEXT,
    "kup" DECIMAL(3,2),
    "kwota_brutto_min" DECIMAL(12,2),
    "kwota_calosciowa" DECIMAL(12,2),
    "stanowisko" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdk_hr_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_hr_monthly_entries" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "miesiac" TIMESTAMP(3) NOT NULL,
    "umowa_wystawiona" BOOLEAN NOT NULL DEFAULT false,
    "rachunek_wystawiony" BOOLEAN NOT NULL DEFAULT false,
    "pit_wyslany" BOOLEAN NOT NULL DEFAULT false,
    "kwota" DECIMAL(12,2),
    "komentarz" TEXT,
    "przekazane_do_podpisu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdk_hr_monthly_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_detailed_documents" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "typ_dokumentu" TEXT NOT NULL,
    "dane" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdk_detailed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdk_attachments" (
    "id" SERIAL NOT NULL,
    "foreigner_id" INTEGER NOT NULL,
    "kategoria" TEXT NOT NULL,
    "nazwa_wyswietlana" TEXT NOT NULL,
    "nazwa_pliku" TEXT NOT NULL,
    "opis" TEXT,
    "typ_pliku" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "rozmiar_bytes" BIGINT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdk_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_data_user_id_key" ON "personal_data"("user_id");

-- CreateIndex
CREATE INDEX "fdk_permits_typ_dokumentu_idx" ON "fdk_permits"("typ_dokumentu");

-- CreateIndex
CREATE INDEX "fdk_permits_data_do_idx" ON "fdk_permits"("data_do");

-- CreateIndex
CREATE INDEX "fdk_permits_nazwisko_idx" ON "fdk_permits"("nazwisko");

-- CreateIndex
CREATE INDEX "fdk_foreigners_nazwisko_idx" ON "fdk_foreigners"("nazwisko");

-- CreateIndex
CREATE INDEX "fdk_foreigners_pesel_idx" ON "fdk_foreigners"("pesel");

-- CreateIndex
CREATE INDEX "fdk_employment_bases_foreigner_id_idx" ON "fdk_employment_bases"("foreigner_id");

-- CreateIndex
CREATE INDEX "fdk_employment_bases_typ_idx" ON "fdk_employment_bases"("typ");

-- CreateIndex
CREATE INDEX "fdk_employment_bases_status_idx" ON "fdk_employment_bases"("status");

-- CreateIndex
CREATE INDEX "fdk_employment_bases_data_do_idx" ON "fdk_employment_bases"("data_do");

-- CreateIndex
CREATE INDEX "fdk_hr_contracts_foreigner_id_idx" ON "fdk_hr_contracts"("foreigner_id");

-- CreateIndex
CREATE INDEX "fdk_hr_monthly_entries_contract_id_idx" ON "fdk_hr_monthly_entries"("contract_id");

-- CreateIndex
CREATE INDEX "fdk_detailed_documents_foreigner_id_idx" ON "fdk_detailed_documents"("foreigner_id");

-- CreateIndex
CREATE INDEX "fdk_detailed_documents_typ_dokumentu_idx" ON "fdk_detailed_documents"("typ_dokumentu");

-- CreateIndex
CREATE INDEX "fdk_attachments_foreigner_id_idx" ON "fdk_attachments"("foreigner_id");

-- CreateIndex
CREATE INDEX "fdk_attachments_kategoria_idx" ON "fdk_attachments"("kategoria");

-- AddForeignKey
ALTER TABLE "personal_data" ADD CONSTRAINT "personal_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdk_employment_bases" ADD CONSTRAINT "fdk_employment_bases_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdk_hr_contracts" ADD CONSTRAINT "fdk_hr_contracts_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdk_hr_monthly_entries" ADD CONSTRAINT "fdk_hr_monthly_entries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "fdk_hr_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdk_detailed_documents" ADD CONSTRAINT "fdk_detailed_documents_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdk_attachments" ADD CONSTRAINT "fdk_attachments_foreigner_id_fkey" FOREIGN KEY ("foreigner_id") REFERENCES "fdk_foreigners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
