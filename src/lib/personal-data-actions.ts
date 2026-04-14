"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/* ============================================================================ */
/*                         PERSONAL DATA (ANKIETA)                              */
/* ============================================================================ */

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sectionASchema = z.object({
  firstNameLatin: z.string().trim().min(1).max(100).optional().or(z.literal("")),
  lastNameLatin: z.string().trim().min(1).max(100).optional().or(z.literal("")),
  nativeFullName: z.string().trim().max(200).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  placeOfBirth: z.string().trim().max(100).optional().or(z.literal("")),
  countryOfBirth: z.string().trim().max(100).optional().or(z.literal("")),
  citizenship: z.string().trim().max(100).optional().or(z.literal("")),
  secondCitizenship: z.string().trim().max(100).optional().or(z.literal("")),
  nationality: z.string().trim().max(100).optional().or(z.literal("")),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional().or(z.literal("")),
  fatherName: z.string().trim().max(100).optional().or(z.literal("")),
  motherName: z.string().trim().max(100).optional().or(z.literal("")),
  motherMaidenName: z.string().trim().max(100).optional().or(z.literal("")),
});

const sectionBSchema = z.object({
  passportNumber: z.string().trim().max(20).optional().or(z.literal("")),
  passportSeries: z.string().trim().max(10).optional().or(z.literal("")),
  passportIssueDate: z.string().optional().or(z.literal("")),
  passportExpiryDate: z.string().optional().or(z.literal("")),
  passportIssuingAuthority: z.string().trim().max(200).optional().or(z.literal("")),
  pesel: z.string().regex(/^\d{11}$/).optional().or(z.literal("")),
  residenceCardNumber: z.string().trim().max(20).optional().or(z.literal("")),
  residenceCardExpiry: z.string().optional().or(z.literal("")),
  visaNumber: z.string().trim().max(20).optional().or(z.literal("")),
  visaType: z.enum(["C", "D", "NATIONAL", "SCHENGEN"]).optional().or(z.literal("")),
  visaExpiry: z.string().optional().or(z.literal("")),
});

const sectionCSchema = z.object({
  street: z.string().trim().max(200).optional().or(z.literal("")),
  houseNumber: z.string().trim().max(20).optional().or(z.literal("")),
  apartmentNumber: z.string().trim().max(20).optional().or(z.literal("")),
  postalCode: z.string().regex(/^\d{2}-\d{3}$/).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  voivodeship: z.string().trim().max(50).optional().or(z.literal("")),
  registrationAddress: z.string().trim().max(500).optional().or(z.literal("")),
  correspondenceAddress: z.string().trim().max(500).optional().or(z.literal("")),
});

const sectionDSchema = z.object({
  phoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  additionalPhone: z.string().trim().max(20).optional().or(z.literal("")),
  preferredLanguage: z.enum(["PL", "EN", "RU", "UA", "OTHER"]).optional().or(z.literal("")),
});

const sectionESchema = z.object({
  firstEntryDate: z.string().optional().or(z.literal("")),
  lastEntryDate: z.string().optional().or(z.literal("")),
  purposeOfStay: z.enum(["WORK", "STUDY", "FAMILY", "OTHER"]).optional().or(z.literal("")),
  currentResidenceTitle: z.enum(["VISA", "RESIDENCE_CARD", "VISA_FREE", "STAMP", "OTHER"]).optional().or(z.literal("")),
  pendingProceedings: z.boolean().optional(),
  caseNumberAtOffice: z.string().trim().max(50).optional().or(z.literal("")),
  handlingOffice: z.string().trim().max(200).optional().or(z.literal("")),
  criminalRecord: z.boolean().optional(),
  deportationProceedings: z.boolean().optional(),
  plannedStayDuration: z.string().trim().max(50).optional().or(z.literal("")),
  occupation: z.string().trim().max(300).optional().or(z.literal("")),
});

const SECTION_SCHEMAS = {
  A: sectionASchema,
  B: sectionBSchema,
  C: sectionCSchema,
  D: sectionDSchema,
  E: sectionESchema,
} as const;

type SectionKey = keyof typeof SECTION_SCHEMAS;

// Pola z datami w każdej sekcji
const DATE_FIELDS: Record<string, boolean> = {
  dateOfBirth: true,
  passportIssueDate: true,
  passportExpiryDate: true,
  residenceCardExpiry: true,
  visaExpiry: true,
  firstEntryDate: true,
  lastEntryDate: true,
};

export async function savePersonalDataAction(
  section: string,
  input: Record<string, unknown>
) {
  const user = await requireUser();

  const schema = SECTION_SCHEMAS[section as SectionKey];
  if (!schema) {
    return { ok: false as const, error: "invalid_section" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "validation" };
  }

  // Przygotuj dane do zapisu — zamień puste stringi na null, daty na Date
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === "" || value === undefined) {
      data[key] = null;
    } else if (DATE_FIELDS[key] && typeof value === "string") {
      data[key] = parseDate(value);
    } else {
      data[key] = value;
    }
  }

  await db.personalData.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/panel/ankieta");
  return { ok: true as const };
}
