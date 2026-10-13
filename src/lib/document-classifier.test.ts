import { describe, it, expect } from "vitest";
import { classifyDocument, extractSentencja } from "./document-classifier";

// ============================================================================
// Section 5.1: Decyzje pobytowe
// ============================================================================

describe("classifyDocument — decyzje pobytowe", () => {
  it("classifies TRC – FDK (art.114 + FDK employer)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 114 ust. 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy i pracę
    w związku z wykonywaniem pracy na rzecz: Firma Dla Każdego Sp. z o.o.
    ul. Lwowska 5/15, Warszawa
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_FDK");
    expect(result.employmentType).toBe("TRC_FDK");
  });

  it("classifies TRC – inny pracodawca (art.114 + non-FDK employer)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 114 ust. 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy i pracę
    na rzecz: ABC Solutions Sp. z o.o., ul. Marszałkowska 10
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_INNY_PRACODAWCA");
    // Default toggle: no employment base for inny pracodawca
    expect(result.employmentType).toBeNull();
  });

  it("classifies Blue Card (art.127)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 127 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu wykonywania pracy wymagającej wysokich kwalifikacji
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_BLUE_CARD");
    expect(result.employmentType).toBe("TRC_BLUE_CARD");
  });

  it("classifies pobyt stały (art.195)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 195 ust. 1 pkt 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt stały
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("POBYT_STALY");
    expect(result.employmentType).toBe("POBYT_STALY");
    expect(result.isIndefinite).toBe(true);
  });

  it("classifies pobyt stały by keywords (na osiedlenie się)", () => {
    const text = `WOJEWODA MAŁOPOLSKI
    zezwalam na osiedlenie się na terytorium Rzeczypospolitej Polskiej
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("POBYT_STALY");
    expect(result.isIndefinite).toBe(true);
  });

  it("classifies rezydent UE (art.211)", () => {
    const text = `Na podstawie art. 211 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt rezydenta długoterminowego UE
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("REZYDENT_UE");
    expect(result.employmentType).toBe("REZYDENT_UE");
    expect(result.isIndefinite).toBe(true);
  });

  it("classifies TRC – studia (art.144)", () => {
    const text = `Na podstawie art. 144 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu kształcenia się na studiach
    do dnia 30.09.2027 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_STUDIA");
    expect(result.employmentType).toBe("TRC_STUDIA");
  });

  it("classifies TRC – małżonek PL (art.158)", () => {
    const text = `Na podstawie art. 158 ust. 1 pkt 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy małżonkowi obywatela polskiego
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_MALZONEK_PL");
    expect(result.employmentType).toBe("TRC_MALZONEK_PL");
  });

  it("classifies TRC – pobyt z cudzoziemcem (art.159)", () => {
    const text = `Na podstawie art. 159 ust. 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu połączenia z rodziną
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_POBYT_Z_CUDZ");
    expect(result.employmentType).toBe("TRC_POBYT_Z_CUDZ");
  });

  it("classifies TRC – humanitarne (art.186 ust.1 pkt 9)", () => {
    const text = `Na podstawie art. 186 ust. 1 pkt 9 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy ze względów humanitarnych
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_HUMANITARNE");
    expect(result.employmentType).toBe("TRC_HUMANITARNE");
  });

  it("classifies TRC – absolwent (art.186 ust.1 pkt 6)", () => {
    const text = `Na podstawie art. 186 ust. 1 pkt 6 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu poszukiwania pracy po ukończeniu studiów
    do dnia 15.06.2027 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_ABSOLWENT");
    expect(result.employmentType).toBe("TRC_ABSOLWENT");
  });

  it("classifies TRC – działalność (art.142)", () => {
    const text = `Na podstawie art. 142 ust. 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu prowadzenia działalności gospodarczej
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_DZIALALNOSC");
    expect(result.employmentType).toBe("TRC_DZIALALNOSC");
  });

  it("classifies TRC – inne okoliczności (art.187)", () => {
    const text = `Na podstawie art. 187 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("TRC_INNE_OKOLICZNOSCI");
    expect(result.employmentType).toBeNull();
  });
});

// ============================================================================
// Section 5.1: Decyzja odmowna / umorzenie / cofnięcie
// ============================================================================

describe("classifyDocument — decyzje negatywne", () => {
  it("detects odmowa (negative decision)", () => {
    const text = `WOJEWODA MAZOWIECKI
    odmawiam udzielenia zezwolenia na pobyt czasowy i pracę
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("ODMOWA");
    expect(result.decisionOutcome).toBe("NEGATIVE");
    expect(result.flags).toContain("alert_krytyczny_utrata_legalnosci");
  });

  it("detects umorzenie", () => {
    const text = `WOJEWODA MAZOWIECKI
    umarza się postępowanie w sprawie udzielenia zezwolenia
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("ODMOWA");
    expect(result.decisionOutcome).toBe("NEGATIVE");
  });

  it("does NOT treat ochrona uzupełniająca as negative (odmowa uchodźcy + ochrona)", () => {
    const text = `Szef Urzędu do Spraw Cudzoziemców
    1. odmówić nadania statusu uchodźcy
    2. udzielić ochrony uzupełniającej
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("OCHRONA_UZUPELNIAJACA");
    expect(result.decisionOutcome).toBe("POSITIVE");
    expect(result.isIndefinite).toBe(true);
  });
});

// ============================================================================
// Section 5.2: Wiza
// ============================================================================

describe("classifyDocument — wiza", () => {
  it("classifies wiza D", () => {
    const text = `WIZA / VISA
    Rodzaj wizy: D
    Od: 01.01.2026 Do: 31.12.2026
    Cel: praca`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("WIZA");
    expect(result.residenceType).toBe("WIZA");
  });
});

// ============================================================================
// Section 5.4: Zezwolenie na pracę
// ============================================================================

describe("classifyDocument — zezwolenie na pracę", () => {
  it("classifies zezwolenie typ A", () => {
    const text = `WOJEWODA MAZOWIECKI
    ZEZWOLENIE na pracę cudzoziemca na terytorium Rzeczypospolitej Polskiej (typu A) nr 12345/2026
    na okres od 01.01.2026 do 31.12.2026
    na stanowisku: programista`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("ZEZWOLENIE_A");
    expect(result.employmentType).toBe("ZEZWOLENIE_A");
    expect(result.residenceType).toBeUndefined();
  });
});

// ============================================================================
// Section 5.5: Oświadczenie
// ============================================================================

describe("classifyDocument — oświadczenie", () => {
  it("classifies PSZ-OPWP oświadczenie", () => {
    const text = `PSZ-OPWP
    OŚWIADCZENIE PODMIOTU O POWIERZENIU WYKONYWANIA PRACY CUDZOZIEMCOWI
    Potwierdzenie wpisu oświadczenia do ewidencji`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("OSWIADCZENIE");
    expect(result.employmentType).toBe("OSWIADCZENIE");
  });

  it("classifies older oświadczenie form", () => {
    const text = `Oświadczenie podmiotu powierzającego wykonywanie pracy cudzoziemcowi
    wpisano do ewidencji oświadczeń
    w okresie Od 01.01.2026 Do 31.12.2026`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("OSWIADCZENIE");
  });
});

// ============================================================================
// Section 5.6: Powiadomienie UA
// ============================================================================

describe("classifyDocument — powiadomienie UA", () => {
  it("classifies PSZ-PPWPU powiadomienie", () => {
    const text = `PSZ-PPWPU(5)
    POWIADOMIENIE o powierzeniu pracy obywatelowi Ukrainy
    Data podjęcia pracy: 01.09.2026`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("POWIADOMIENIE_UA");
    expect(result.employmentType).toBe("POWIADOMIENIE_UA");
    expect(result.residenceType).toBeUndefined();
  });
});

// ============================================================================
// Section 5.7: PESEL UKR
// ============================================================================

describe("classifyDocument — PESEL UKR", () => {
  it("classifies PESEL UKR zaświadczenie", () => {
    const text = `Zaświadczenie z rejestru PESEL
    adnotacja UKR - ochrona czasowa`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("PESEL_UKR");
    expect(result.residenceType).toBe("PESEL_UKR");
    expect(result.setsUkrProtection).toBe(true);
  });
});

// ============================================================================
// Section 5.8: Obywatele UE
// ============================================================================

describe("classifyDocument — obywatele UE", () => {
  it("classifies EU citizen registration", () => {
    const text = `ZAŚWIADCZENIE O ZAREJESTROWANIU POBYTU OBYWATELA UE`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("OBYWATEL_UE");
    expect(result.employmentType).toBe("OBYWATEL_UE");
  });

  it("classifies UK withdrawal agreement", () => {
    const text = `KARTA POBYTU
    RODZAJ ZEZWOLENIA: ART. 50 TUE
    UWAGI: ART. 18 UST. 4 UMOWY WYSTĄPIENIA`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("UMOWA_WYSTAPIENIA");
    expect(result.employmentType).toBe("UMOWA_WYSTAPIENIA");
  });
});

// ============================================================================
// Section 3.1: Key classification principles
// ============================================================================

describe("classifyDocument — zasady ogólne", () => {
  it("does NOT default to TRC_FDK for unknown TRC (rule 3.1.3)", () => {
    const text = `WOJEWODA MAZOWIECKI
    udzielam zezwolenia na pobyt czasowy
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("UNKNOWN");
    expect(result.flags).toContain("typ_nieustalony");
  });

  it("article has priority over keywords (rule 3.1.9)", () => {
    const text = `Na podstawie art. 186 ust. 1 pkt 9 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy i pracę
    na rzecz: Firma Dla Każdego Sp. z o.o.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    // Art. 186/1/9 = humanitarne, even though "na rzecz FDK" suggests TRC_FDK
    expect(result.residenceType).toBe("TRC_HUMANITARNE");
  });

  it("sentencja positive wins over negative in pouczenie", () => {
    const text = `WOJEWODA MAZOWIECKI
    udzielam zezwolenia na pobyt czasowy i pracę
    Pouczenie: od niniejszej decyzji przysługuje odwołanie`;
    const result = classifyDocument(text);
    expect(result.primaryType).not.toBe("ODWOLANIE");
    expect(result.primaryType).not.toBe("ODMOWA");
  });

  it("flags Wojewoda Wielkopolski for manual dataOd", () => {
    const text = `WOJEWODA WIELKOPOLSKI
    Na podstawie art. 114 ust. 1 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy i pracę
    na rzecz: Firma Dla Każdego
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.dataOdManualFlag).toBe(true);
  });
});

// ============================================================================
// Section 5.13: Zgoda humanitarna
// ============================================================================

describe("classifyDocument — zgoda humanitarna", () => {
  it("classifies zgoda na pobyt ze względów humanitarnych (art.348)", () => {
    const text = `Na podstawie art. 348 ustawy o cudzoziemcach
    udzielam zgody na pobyt ze względów humanitarnych
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("ZGODA_HUMANITARNA");
    expect(result.employmentType).toBe("WIZA_HUMANITARNA");
  });
});

// ============================================================================
// extractSentencja
// ============================================================================

describe("extractSentencja", () => {
  it("extracts text between udzielam and Uzasadnienie", () => {
    const full = `WOJEWODA MAZOWIECKI
    Sygnatura: SC-V.6151.1.8080.2023
    udzielam zezwolenia na pobyt czasowy i pracę Panu Jan Kowalski
    do dnia 15.06.2028 r.
    Uzasadnienie:
    Wniosek złożono dnia...`;
    const s = extractSentencja(full);
    expect(s).toContain("udzielam");
    expect(s).toContain("do dnia 15.06.2028");
    expect(s).not.toContain("Wniosek złożono");
  });
});

// ============================================================================
// Status uchodźcy / ochrona
// ============================================================================

describe("classifyDocument — status uchodźcy", () => {
  it("classifies status uchodźcy", () => {
    const text = `Szef Urzędu do Spraw Cudzoziemców
    postanawiam nadać status uchodźcy
    DPU.420.4028.2023
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.residenceType).toBe("STATUS_UCHODZCY");
    expect(result.employmentType).toBe("STATUS_UCHODZCY");
    expect(result.isIndefinite).toBe(true);
  });
});

// ============================================================================
// Karta Polaka
// ============================================================================

describe("classifyDocument — Karta Polaka", () => {
  it("classifies Karta Polaka as employment-only", () => {
    const text = `KARTA POLAKA nr 12345
    ważna do 31.12.2030`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("KARTA_POLAKA");
    expect(result.employmentType).toBe("KARTA_POLAKA");
    expect(result.residenceType).toBeUndefined();
  });
});

// ============================================================================
// Regression tests (section 9 — pre-write checks)
// ============================================================================

describe("classifyDocument — regressions", () => {
  it("does NOT default to TRC_FDK for generic TRC (returns UNKNOWN)", () => {
    const text = `WOJEWODA MAZOWIECKI
    udzielam zezwolenia na pobyt czasowy
    do dnia 15.06.2028 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("UNKNOWN");
    expect(result.flags).toContain("do_weryfikacji");
  });

  it("detects Blue Card BEFORE generic TRC", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 127 ustawy o cudzoziemcach
    udzielam zezwolenia na pobyt czasowy w celu wykonywania pracy
    wymagającej wysokich kwalifikacji
    do dnia 28.05.2027 r.
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).not.toBe("TRC_FDK");
    // Should be Blue Card or TRC_BLUE_CARD
    expect(result.residenceType).toBe("TRC_BLUE_CARD");
  });

  it("classifies odmowa as NEGATIVE (no basis created)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 100 ustawy o cudzoziemcach
    odmawiam udzielenia zezwolenia na pobyt czasowy
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("ODMOWA");
    expect(result.decisionOutcome).toBe("NEGATIVE");
  });

  it("classifies art. 120 as change decision (no new basis)", () => {
    const text = `WOJEWODA MAZOWIECKI
    Na podstawie art. 120 ustawy o cudzoziemcach
    orzekam o zmianie zezwolenia na pobyt czasowy
    Uzasadnienie:`;
    const result = classifyDocument(text);
    expect(result.primaryType).toBe("ZMIANA_DECYZJI");
  });
});
