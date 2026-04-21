export const inputBase =
  "block w-full rounded-md border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface";

export const labelBase = "block text-sm font-medium text-primary mb-1.5";

export const VOIVODESHIPS = [
  "dolnoslaskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "lodzkie",
  "malopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "slaskie",
  "swietokrzyskie",
  "warminsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export const GENDER_OPTIONS = ["MALE", "FEMALE"] as const;

export const MARITAL_STATUS_OPTIONS = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
] as const;

export const EDUCATION_OPTIONS = [
  "PRIMARY",
  "SECONDARY",
  "HIGHER",
  "VOCATIONAL",
] as const;

export const EYE_COLOR_OPTIONS = [
  "BROWN",
  "BLUE",
  "GREEN",
  "GREY",
  "HAZEL",
  "BLACK",
  "OTHER",
] as const;

export const VISA_TYPE_OPTIONS = ["C", "D", "NATIONAL", "SCHENGEN"] as const;

export const PREFERRED_LANGUAGE_OPTIONS = [
  "PL",
  "EN",
  "RU",
  "UA",
  "OTHER",
] as const;

export const PURPOSE_OF_STAY_OPTIONS = [
  "WORK",
  "STUDY",
  "FAMILY",
  "OTHER",
] as const;

export const RESIDENCE_TITLE_OPTIONS = [
  "VISA",
  "RESIDENCE_CARD",
  "VISA_FREE",
  "STAMP",
  "OTHER",
] as const;

export const HANDLING_OFFICES = [
  "UW_DOLNOSLASKIE",
  "UW_KUJAWSKO_POMORSKIE",
  "UW_LUBELSKIE",
  "UW_LUBUSKIE",
  "UW_LODZKIE",
  "UW_MALOPOLSKIE",
  "UW_MAZOWIECKIE",
  "UW_OPOLSKIE",
  "UW_PODKARPACKIE",
  "UW_PODLASKIE",
  "UW_POMORSKIE",
  "UW_SLASKIE",
  "UW_SWIETOKRZYSKIE",
  "UW_WARMINSKO_MAZURSKIE",
  "UW_WIELKOPOLSKIE",
  "UW_ZACHODNIOPOMORSKIE",
] as const;

export function dateToInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export type PersonalDataValues = Record<string, string | boolean | null>;
