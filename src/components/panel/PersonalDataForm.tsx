"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { savePersonalDataAction, saveBiometricPhotoAction } from "@/lib/personal-data-actions";
import { MosPhotoUpload } from "./MosPhotoUpload";
import { dateToInput } from "./personal-data/constants";
import { SectionA } from "./personal-data/SectionA";
import { SectionB } from "./personal-data/SectionB";
import { SectionC } from "./personal-data/SectionC";
import { SectionD } from "./personal-data/SectionD";
import { SectionE } from "./personal-data/SectionE";
import { SectionF } from "./personal-data/SectionF";
import { SectionG } from "./personal-data/SectionG";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Save,
  AlertCircle,
} from "lucide-react";
import type { PersonalData } from "@prisma/client";

// Pola date do konwersji z Date → string (yyyy-mm-dd)
const DATE_KEYS = [
  "dateOfBirth",
  "passportIssueDate",
  "passportExpiryDate",
  "residenceCardExpiry",
  "visaExpiry",
  "firstEntryDate",
  "lastEntryDate",
  "contractFrom",
  "contractTo",
];

// Które pola należą do której sekcji
const SECTION_FIELDS: Record<string, string[]> = {
  A: [
    "firstNameLatin", "lastNameLatin", "nativeFullName", "previousName", "gender",
    "dateOfBirth", "placeOfBirth", "countryOfBirth", "citizenship",
    "secondCitizenship", "nationality", "maritalStatus", "education",
    "height", "eyeColor", "specialFeatures", "fatherName",
    "motherName", "motherMaidenName",
  ],
  B: [
    "passportNumber", "passportIssueDate", "passportExpiryDate",
    "pesel", "residenceCardNumber", "residenceCardExpiry",
    "visaNumber", "visaType", "visaExpiry",
  ],
  C: [
    "street", "houseNumber", "apartmentNumber", "postalCode",
    "city", "voivodeship", "registrationAddress", "correspondenceAddress",
  ],
  D: ["phoneNumber", "contactEmail", "additionalPhone", "preferredLanguage"],
  E: [
    "firstEntryDate", "lastEntryDate", "purposeOfStay", "currentResidenceTitle",
    "pendingProceedings", "caseNumberAtOffice", "handlingOffice",
    "criminalRecord", "deportationProceedings", "plannedStayDuration", "occupation",
  ],
  F: [
    "employerName", "employerStreet", "employerHouseNumber", "employerApartmentNumber",
    "employerPostalCode", "employerCity", "employerPhone", "employerEmail",
    "contractType", "contractFrom", "contractTo", "contractIndefinite", "salary",
  ],
  G: [
    "familyMembersInPoland", "lastEntryDetails", "previousVisitsPoland",
    "travelsOutsidePoland", "addressCountryOfOrigin", "previousAddressesPoland",
  ],
};

// Wymagane pola per sekcja (do sprawdzania kompletności)
const REQUIRED_FIELDS: Record<string, string[]> = {
  A: ["firstNameLatin", "lastNameLatin", "gender", "dateOfBirth", "placeOfBirth", "countryOfBirth", "citizenship", "maritalStatus", "education", "fatherName", "motherName"],
  B: ["passportNumber", "passportIssueDate", "passportExpiryDate", "passportIssuingAuthority"],
  C: ["street", "houseNumber", "postalCode", "city", "voivodeship"],
  D: ["phoneNumber", "contactEmail", "preferredLanguage"],
  E: [],
  F: [],
  G: [],
};

function initialValuesFromData(data: PersonalData | null): Record<string, string | boolean | null> {
  if (!data) return {};
  const result: Record<string, string | boolean | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "userId" || key === "createdAt" || key === "updatedAt") continue;
    if (value instanceof Date || (typeof value === "string" && DATE_KEYS.includes(key))) {
      result[key] = dateToInput(value as Date);
    } else {
      result[key] = value as string | boolean | null;
    }
  }
  return result;
}

const SECTIONS = ["A", "B", "C", "D", "E", "F", "G"] as const;

interface Props {
  initialData: PersonalData | null;
}

export function PersonalDataForm({ initialData }: Props) {
  const t = useTranslations("panel.questionnaire");
  const router = useRouter();
  const [values, setValues] = useState(() => initialValuesFromData(initialData));
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["A"]));
  const [isPending, startTransition] = useTransition();
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [errorSection, setErrorSection] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const isSectionComplete = (section: string) => {
    const required = REQUIRED_FIELDS[section] ?? [];
    return required.every((field) => {
      const val = values[field];
      return val !== null && val !== undefined && val !== "";
    });
  };

  const saveSection = (section: string) => {
    setSavedSection(null);
    setErrorSection(null);

    const fields = SECTION_FIELDS[section] ?? [];
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const val = values[field];
      // Zamień boolean-string na boolean
      if (val === "true") data[field] = true;
      else if (val === "false") data[field] = false;
      else data[field] = val ?? "";
    }

    startTransition(async () => {
      const result = await savePersonalDataAction(section, data);
      if (result.ok) {
        setSavedSection(section);
        router.refresh();
      } else {
        setErrorSection(section);
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
    A: SectionA,
    B: SectionB,
    C: SectionC,
    D: SectionD,
    E: SectionE,
    F: SectionF,
    G: SectionG,
  };

  const handlePhotoReady = async (dataUrl: string) => {
    setPhotoSaving(true);
    setPhotoSaved(false);
    await saveBiometricPhotoAction(dataUrl);
    setPhotoSaving(false);
    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Biometric photo */}
      <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-display text-base font-bold text-primary">
          {t("photo.title")}
        </h3>
        <p className="mb-4 text-xs text-primary/60">
          {t("photo.description")}
        </p>
        <MosPhotoUpload
          initialPhoto={initialData?.biometricPhoto}
          onPhotoReady={handlePhotoReady}
        />
        {photoSaving && (
          <p className="mt-2 text-xs text-primary/50">{t("saving")}</p>
        )}
        {photoSaved && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t("saved")}</span>
          </div>
        )}
      </div>

      {SECTIONS.map((section) => {
        const isOpen = openSections.has(section);
        const complete = isSectionComplete(section);
        const SectionComponent = SECTION_COMPONENTS[section];

        return (
          <div
            key={section}
            className="rounded-2xl border border-primary/10 bg-white shadow-sm"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-3">
                {complete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-primary/30" />
                )}
                <span className="font-display text-base font-bold text-primary">
                  {t(`section${section}.title`)}
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-primary/40" />
              ) : (
                <ChevronRight className="h-5 w-5 text-primary/40" />
              )}
            </button>

            {/* Content */}
            {isOpen && (
              <div className="border-t border-primary/10 p-5">
                <SectionComponent
                  values={values}
                  onChange={handleChange}
                  t={(key: string) => t(`section${section}.${key}` as never)}
                />

                {/* Status messages */}
                {savedSection === section && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{t("saved")}</span>
                  </div>
                )}
                {errorSection === section && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("error")}</span>
                  </div>
                )}

                {/* Save button */}
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveSection(section)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isPending ? t("saving") : t("saveButton")}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
