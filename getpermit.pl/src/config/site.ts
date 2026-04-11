/**
 * Centralna konfiguracja danych firmowych.
 * Wszystkie placeholdery do podmiany przez klienta są tutaj.
 */
export const siteConfig = {
  name: "getpermit.pl",
  legalName: "UTM Group Grzegorz Stępień",
  description: {
    pl: "Profesjonalna pomoc w legalizacji pobytu i pracy cudzoziemców w Polsce.",
    en: "Professional help with residence and work legalization for foreigners in Poland.",
    ru: "Профессиональная помощь в легализации пребывания и работы иностранцев в Польше.",
    uk: "Професійна допомога у легалізації перебування та роботи іноземців у Польщі.",
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://getpermit.pl",

  // === DANE DO PODMIANY ===
  contact: {
    email: "kontakt@getpermit.pl",
    phone: "+48 XXX XXX XXX",
    whatsapp: "48XXXXXXXXX",
    telegram: "getpermit",
    address: {
      street: "ul. XXXXXXXX 00",
      postal: "00-000",
      city: "Warszawa",
      country: "Polska",
    },
  },

  company: {
    nip: "9482342576",
  },

  social: {
    facebook: "https://facebook.com/getpermit",
    instagram: "https://instagram.com/getpermit",
    telegram: "https://t.me/getpermit",
    linkedin: "https://linkedin.com/company/getpermit",
  },

  // Statystyki na stronie głównej
  stats: {
    yearsOfExperience: 10,
    clientsServed: 5000,
    successRate: 98,
  },

  // Cal.com — adres event-typu pokazywany w modalu "Umów konsultację".
  calcom: {
    url:
      process.env.NEXT_PUBLIC_CALCOM_URL ||
      "https://cal.eu/getpermit",
  },
} as const;

export type SiteConfig = typeof siteConfig;
