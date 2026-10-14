import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseOswiadczeniePdf, ocrExtractStructured, getLastOcrError, detectDocumentType } from "@/lib/pdf-parser";
import { deactivatePreviousResidencePermits, namesMatch, isOswiadczenieAllowedForCitizenship } from "@/lib/fdk-queries";
import { classifyToFolder } from "@/lib/folder-classifier";
import { runPreWriteChecks, checkEmploymentResidenceConsistency } from "@/lib/pre-write-checks";
import { mapDetectedTypeToBaseTypes } from "@/lib/legalizacja-config";

// Allow up to 120s for scrape action (OCR via Claude can take 30-60s for large multi-page scans)
export const maxDuration = 120;

/**
 * GET /api/fdk/attachments/[id]?action=download|preview
 *
 * Pobiera plik z Supabase Storage. Preview generuje signed URL (redirect),
 * download streamuje plik z nagłówkiem Content-Disposition.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const attachment = await db.fdkAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const action = request.nextUrl.searchParams.get("action") ?? "preview";
  const supabase = createSupabaseAdminClient();

  if (action === "preview") {
    // Signed URL — redirect do Supabase (60 min)
    const { data, error } = await supabase.storage
      .from("fdk-attachments")
      .createSignedUrl(attachment.storagePath, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Could not generate preview URL" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  }

  // Debug — show raw text extracted from PDF (for debugging parser)
  if (action === "debug-text") {
    if (attachment.typPliku !== "pdf") {
      return NextResponse.json({ error: "Only PDF files support debug-text (use scrape for images)" }, { status: 400 });
    }
    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);
    if (dlError || !fileData) {
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(await fileData.arrayBuffer()));
      return NextResponse.json({ text: pdfData.text, length: pdfData.text?.length ?? 0 });
    } catch (err) {
      return NextResponse.json({ error: "PDF parse failed", details: String(err) }, { status: 500 });
    }
  }

  // Debug OCR — show raw extraction result without creating any records
  if (action === "debug-ocr") {
    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);
    if (dlError || !fileData) return NextResponse.json({ error: "Download failed" }, { status: 500 });
    const buf = await fileData.arrayBuffer();
    const isImg = ["jpeg", "jpg", "png"].includes(attachment.typPliku);
    const mType = isImg ? (attachment.typPliku === "png" ? "image/png" as const : "image/jpeg" as const) : "application/pdf" as const;
    const result = await ocrExtractStructured(buf, mType, attachment.nazwaPliku);
    return NextResponse.json({ raw: result, ocrError: getLastOcrError() });
  }

  // Scrape — parse PDF/image and auto-fill foreigner + create employment base
  // Section 2: only scrape files from "Ważne" folder
  if (action === "scrape") {
    if (attachment.folder && attachment.folder !== "wazne" && attachment.folder !== "inne_dokumenty" && !attachment.folder.startsWith("trc")) {
      return NextResponse.json({
        error: "Scraping jest dostępny tylko dla plików z kategorii Ważne. Przenieś plik do Ważne, jeśli to dokument tworzący podstawę.",
      }, { status: 400 });
    }

    const scrapableTypes = ["pdf", "jpeg", "jpg", "png"];
    if (!scrapableTypes.includes(attachment.typPliku)) {
      return NextResponse.json({ error: "Only PDF and image files (JPG, PNG) can be scraped" }, { status: 400 });
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);

    if (dlError || !fileData) {
      return NextResponse.json({ error: "Could not download file for parsing" }, { status: 500 });
    }

    const buffer = await fileData.arrayBuffer();
    const isImage = ["jpeg", "jpg", "png"].includes(attachment.typPliku);
    let parsed;
    try {
      if (isImage) {
        // Images go directly to structured OCR extraction (Claude Vision)
        const mediaType = attachment.typPliku === "png" ? "image/png" as const : "image/jpeg" as const;
        parsed = await ocrExtractStructured(buffer, mediaType, attachment.nazwaPliku);
      } else {
        parsed = await parseOswiadczeniePdf(buffer, { filename: attachment.nazwaPliku });
      }
    } catch (scrapeErr: unknown) {
      const msg = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
      console.error(`[scrape] Error for attachment ${id}: ${msg}`);
      return NextResponse.json({
        error: `Blad przetwarzania pliku: ${msg}. Sprobuj ponownie lub wprowadz dane recznie.`,
        manualEntryRequired: true,
        ocrDiagnostic: "exception",
      }, { status: 422 });
    }

    if (!parsed) {
      const ocrErr = getLastOcrError();
      let errorMsg: string;
      let userFriendly = true;
      if (ocrErr?.type === "no_key") {
        errorMsg = "Brak klucza API do OCR. Skontaktuj się z administratorem.";
      } else if (ocrErr?.type === "api_error" && ocrErr.retryable) {
        // Retryable error (429, 500, credit balance) — user-friendly message, no raw error
        errorMsg = "Odczyt czeka w kolejce — administrator został powiadomiony. Spróbuj ponownie za kilka minut.";
        console.error(`[scrape] Retryable OCR error for attachment ${id}: ${ocrErr.message}`);
      } else if (ocrErr?.type === "api_error") {
        errorMsg = "OCR nie powiódł się. Spróbuj ponownie lub wprowadź dane ręcznie.";
        console.error(`[scrape] Non-retryable OCR error for attachment ${id}: ${ocrErr.message}`);
      } else {
        errorMsg = "Nie udało się wyciągnąć danych z PDF (brak warstwy tekstowej i OCR nie zwrócił danych). Wprowadź dane ręcznie.";
      }
      return NextResponse.json({
        error: errorMsg,
        manualEntryRequired: true,
        ocrDiagnostic: ocrErr?.type ?? "no_text_layer",
        retryable: ocrErr?.type === "api_error" && ocrErr.retryable,
      }, { status: 422 });
    }

    const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
    if (!foreigner) {
      return NextResponse.json({ error: "Foreigner not found" }, { status: 404 });
    }

    // Clear previous "different person" warning on re-scrape
    if (attachment.opis?.startsWith("\u26a0 Dokument innej osoby")) {
      await db.fdkAttachment.update({
        where: { id: attachment.id },
        data: { opis: null },
      });
    }

    // Check if document belongs to a different person
    const extractedFullName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
    const profileFullName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
    // Skip junk names: form labels ("Nazwisko Nadawcy"), country fragments ("Republiki Południowej")
    const JUNK_NAME_RE = [
      /nazwisk\w*\s+nadawc/i, /imi[eę]\s+i?\s*nazwisk/i, /nadawc[aey]/i, /podpis\s+osoby/i,
      /pe[lł]nomocnik/i, /adresat/i, /wnioskodawc/i, /cudzoziemiec/i,
      /strona\s+post[eę]powan/i, /lub\s+imion/i, /^pan[aiu]?\s+/i,
      /^republik/i, /po[łl]udniow/i, /federacj/i, /rosyjsk/i, /rzeczpospolit/i,
      /wielk\w+\s+brytan/i, /zjednoczon\w+\s+kr[oó]lestw/i, /stan[yó]\s+zjednoczon/i,
      /ameryk/i, /zimbabwe/i, /armeni/i, /^ukrain/i, /^indie\b|^indii\b/i,
      /^nr\s+/i, /^data\s+/i, /organ\s+wydaj/i,
      // Fix false positives from form labels (diagnosed in Skuratovich/Liudvichenka/Morozov/Valovich)
      /^I\s+Nazwisko/i,            // "I Nazwisko Pełnomocnika", "I Nazwisko Mp", "I Nazwisko Paszport", "I Nazwisko Nadawcy"
      /^Poprzednie\s+Rodowe/i,     // INPOL form label "Poprzednie Rodowe"
      /^Odojcowskie/i,             // Birth certificate form label
      /^Pl\s+Pl$/i,               // BPOP/BPWP form artifact
      /\bMp$/i,                   // Form label "Mp" (miejscowość podpisania)
      /^Krs$/i,                   // KRS label parsed as name
      /^Poland$/i,                // Country name parsed as person
      /\bPaszport$/i,             // "I Nazwisko Paszport" form label
      /\bNadawcy$/i,              // "I Nazwisko Nadawcy"
      /^Pozosta[łl]ych\s+Pe[łl]nomocnik/i, // "Pozostałych Pełnomocników"
      /^Noszone\s+Po/i,           // Birth certificate: "Noszone Po"
      /^Urodzony/i,               // Birth certificate: "Urodzony"
      /GRA[ŻZ]YNA\s+KOWALSKA/i,   // Known authorization agreement template name
    ];
    const isJunkName = JUNK_NAME_RE.some((p) => p.test(extractedFullName));
    // Transliterate Cyrillic names before comparing
    const CYR: Record<string, string> = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"shch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"};
    let compareExtracted = extractedFullName;
    if (/[\u0400-\u04FF]/.test(compareExtracted)) {
      compareExtracted = compareExtracted.split("").map(c => { const l = c.toLowerCase(); return CYR[l] !== undefined ? (c === l ? CYR[l] : (CYR[l].charAt(0).toUpperCase() + CYR[l].slice(1))) : c; }).join("");
    }
    const isDifferentPerson = compareExtracted.length > 2
      && profileFullName.length > 2
      && foreigner.nazwisko !== "Nowy"
      && !isJunkName
      && !namesMatch(compareExtracted, profileFullName);

    // Update folder + detectedType (unless user manually set the folder)
    const updateFolderData: Record<string, unknown> = {
      detectedType: parsed.detectedType ?? null,
    };
    if (!attachment.folderManual) {
      updateFolderData.folder = classifyToFolder(parsed.detectedType ?? null, isDifferentPerson, attachment.nazwaPliku, attachment.kategoria);
    }
    await db.fdkAttachment.update({
      where: { id: attachment.id },
      data: updateFolderData,
    });

    if (isDifferentPerson) {
      // Flag the attachment and log — do NOT create employment base
      const warningNote = `\u26a0 Dokument innej osoby: ${extractedFullName}`;
      await db.fdkAttachment.update({
        where: { id: attachment.id },
        data: { opis: warningNote },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape pliku ${attachment.nazwaPliku}: rozpoznano INNA OSOBE (${extractedFullName}) — podstawa NIE utworzona. Profil: ${profileFullName}.`,
        },
      });

      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: [],
        employmentBaseCreated: null,
        warning: `Dokument dotyczy innej osoby: ${extractedFullName} (profil: ${profileFullName}). Podstawa zatrudnienia NIE została utworzona.`,
      });
    }

    // Auto-fill foreigner data if fields are empty
    const foreignerUpdateData: Record<string, unknown> = {};
    if (parsed.imie && !foreigner.imie) foreignerUpdateData.imie = parsed.imie;
    if (parsed.nazwisko && foreigner.nazwisko === "Nowy") foreignerUpdateData.nazwisko = parsed.nazwisko;
    if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) foreignerUpdateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
    if (parsed.obywatelstwo && !foreigner.obywatelstwo) foreignerUpdateData.obywatelstwo = parsed.obywatelstwo;
    if (parsed.nrPaszportu && !foreigner.nrPaszportu) foreignerUpdateData.nrPaszportu = parsed.nrPaszportu;

    if (Object.keys(foreignerUpdateData).length > 0) {
      await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: foreignerUpdateData });
      // Log auto-filled foreigner fields from scrape
      for (const [key, value] of Object.entries(foreignerUpdateData)) {
        await db.fdkChangeLog.create({
          data: {
            foreignerId: attachment.foreignerId,
            changedBy,
            field: key,
            oldValue: null,
            newValue: value instanceof Date ? (value as Date).toISOString().slice(0, 10) : String(value),
          },
        });
      }
    }

    // ODWOLANIE: do NOT create an employment base — just log and return extracted data
    if (parsed.detectedType === "ODWOLANIE") {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano odwolanie od decyzji w pliku: ${attachment.nazwaPliku}. Podstawa zatrudnienia NIE utworzona.`,
        },
      });

      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
      });
    }

    // --- ODMOWA / ZMIANA_DECYZJI / UNKNOWN: no basis ---
    if (parsed.detectedType === "ODMOWA" || parsed.detectedType === "ZMIANA_DECYZJI" || parsed.detectedType === "UNKNOWN") {
      const label = parsed.detectedType === "ODMOWA" ? "decyzję odmowną/umorzenie"
        : parsed.detectedType === "ZMIANA_DECYZJI" ? "decyzję zmieniającą (art. 120)"
        : "nierozpoznany typ dokumentu";
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano ${label} w pliku: ${attachment.nazwaPliku}. Podstawa NIE utworzona — do weryfikacji ręcznej.`,
        },
      });
      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
        warning: `Rozpoznano ${label}. Podstawa NIE została utworzona.${parsed.detectedType === "ODMOWA" ? " ⚠ ALERT: ryzyko utraty legalności pobytu." : ""}`,
      });
    }

    // --- Documents that NEVER create bases (section 5 of legalization rules) ---
    // Check by filename patterns — these documents are procedural attachments, not basis-creating
    const NO_BASIS_FILENAME_PATTERNS = [
      /opłata|oplata|fee|potwierdzenie.*(?:CEN|przelew|wpłat|oplat)/i,
      /wniosek.*(?:TRC|MOS|INPOL|pobyt|rezydent)/i,
      /za[łl][aą]cznik\s*nr\s*[12]/i,
      /WNIOSEK-OSW_|OSW-UTRZYMANIE_|OSW-NIEKARALNOSC_|OSW-POBYT-3-LATA_/i,
      /PSZ-PPPO|PSZ-PZPO|PGP-UZC/i,
      /pe[łl]nomocnictwo|power.*attorney|PoA[_\s]/i,
      /pismo.*przewodnie|cover.*letter/i,
      /wezwani[ea]|zawiadomieni[ea]|ponagleni[ea]|przyspieszeni[ea]/i,
      /ankiet[ay]|kwestionariusz/i,
      /umowa.*(?:najm|zleceni|dzieł|prac|współprac)|anex|aneks|rachunek|rachunki/i,
      /polisa|ubezpieczeni[ea]|insurance/i,
      /PIT[-_\s]?\d|ZUS|zus.*sk[łl]adk/i,
      /tłumaczeni[ea]|translation/i,
      /akt.*(?:urodzeni|małżeńst|ślubu)/i,
      /legitymacj[ay].*(?:studenck|szkoln)/i,
      /świadectw[ao].*szkoł/i,
      /formular[z]|szablon|template|draft/i,
      /informacja.*starost/i,
      /odpowied[źz].*wezwani/i,
      /upo(?:[\s_.]|$)/i,
      /(?:potwierdzenie|confirmation).*(?:wysłan|wyslani|send|deliver|złożen|epuap|poczta)/i,
      /oswiadczenie.*(?:utrzymani|niekaraln|pobyt.*3.*lat|liczb.*osób)/i,
      /o[śs]wiadczeni[ea].*(?:o\s+liczbie|praca.*tabelka)/i,
      /(?:podjęci[ea]|niepodjęci[ea]|zakończeni[ea]).*(?:pracy|zatrudnieni)/i,
      /zg[łl]oszeni[ea].*umowy/i,
      /KRS|sprawozdani[ea]/i,
      /loginy.*has[łl]a/i,
      /tabela.*dane.*rezerwacj/i,
      /uzupe[łl]nieni[ea](?!.*decyzj)/i,
    ];
    const fnLower = attachment.nazwaPliku.toLowerCase();
    const isNoBasisByFilename = NO_BASIS_FILENAME_PATTERNS.some((p) => p.test(fnLower));

    if (isNoBasisByFilename && !parsed.detectedType) {
      // Filename strongly suggests non-basis document AND parser couldn't detect a basis type
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Plik ${attachment.nazwaPliku}: dokument proceduralny (nie tworzy podstaw). Dane odczytane, ale podstawa NIE utworzona.`,
        },
      });
      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
        message: "Rozpoznano dokument proceduralny (opłata, wniosek, pełnomocnictwo, pismo itp.). Podstawa NIE została utworzona.",
      });
    }

    // --- No default type. Unrecognized document = no basis (section 4.1 rule 2) ---
    if (!parsed.detectedType) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Plik ${attachment.nazwaPliku}: nie rozpoznano typu dokumentu. Podstawa NIE utworzona — do weryfikacji ręcznej.`,
        },
      });
      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
        warning: "Nie rozpoznano typu dokumentu. Podstawa NIE została utworzona. Wprowadź dane ręcznie lub oznacz typ dokumentu.",
      });
    }

    // All other detected types create/update employment base
    let docType = parsed.detectedType as import("@prisma/client").FdkBaseType;

    // --- Walidacja obywatelstwa dla oświadczeń (pkt 1 — reguła krajów) ---
    if (docType === "OSWIADCZENIE") {
      const citizenship = foreigner.obywatelstwo ?? parsed.obywatelstwo;
      if (citizenship) {
        const allowed = await isOswiadczenieAllowedForCitizenship(citizenship, parsed.dataOd ? new Date(parsed.dataOd) : null);
        if (!allowed) {
          // Próba reklasyfikacji — może to zezwolenie, powiadomienie UA, itp.
          // Ponownie wykrywamy typ z surowego tekstu, pomijając OSWIADCZENIE
          const rawText = [parsed.stanowisko, parsed.firma, parsed.rodzajPracy, parsed.nrDecyzji].filter(Boolean).join(" ");
          const altType = detectDocumentType(rawText, attachment.nazwaPliku);
          const reclassifiedType = altType && altType !== "OSWIADCZENIE" && altType !== "ODWOLANIE" ? altType : null;

          if (reclassifiedType) {
            // Reklasyfikacja udana — kontynuuj z nowym typem
            docType = reclassifiedType as import("@prisma/client").FdkBaseType;
            parsed.detectedType = reclassifiedType;
            await db.fdkChangeLog.create({
              data: {
                foreignerId: attachment.foreignerId,
                changedBy,
                field: "scrape",
                oldValue: null,
                newValue: `Plik ${attachment.nazwaPliku}: rozpoznano jako Oświadczenie, ale obywatelstwo "${citizenship}" nie uprawnia. Przeklasyfikowano na ${reclassifiedType}.`,
              },
            });
          } else {
            // Nie da się reklasyfikować — log i do weryfikacji ręcznej
            await db.fdkChangeLog.create({
              data: {
                foreignerId: attachment.foreignerId,
                changedBy,
                field: "scrape",
                oldValue: null,
                newValue: `Plik ${attachment.nazwaPliku}: rozpoznano jako Oświadczenie, ale obywatelstwo "${citizenship}" nie uprawnia do oświadczeń. Podstawa NIE utworzona — do weryfikacji ręcznej.`,
              },
            });

            return NextResponse.json({
              ok: true,
              extracted: parsed,
              foreignerUpdated: Object.keys(foreignerUpdateData),
              employmentBaseCreated: null,
              warning: `Obywatelstwo "${citizenship}" nie uprawnia do oświadczeń o powierzeniu pracy. Dokument wymaga ręcznej weryfikacji (może to być powiadomienie, zezwolenie lub załącznik do wniosku).`,
            });
          }
        }
      }
    }

    // --- Pre-write checks BEFORE creating basis (section 9) ---
    const preWriteIssues = runPreWriteChecks(parsed, { imie: foreigner.imie, nazwisko: foreigner.nazwisko });
    const blockingIssues = preWriteIssues.filter((i) => i.severity === "error");
    if (blockingIssues.length > 0) {
      const errorMsgs = blockingIssues.map((i) => `[#${i.checkId}] ${i.message}`);
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Plik ${attachment.nazwaPliku}: kontrola przed zapisem zablokował utworzenie podstawy. ${errorMsgs.join("; ")}`,
        },
      });
      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
        preWriteIssues,
        warning: `Kontrola przed zapisem wykryła błędy: ${errorMsgs.join(" | ")}. Podstawa NIE została utworzona — do weryfikacji ręcznej.`,
      });
    }

    // Match existing base: first by sourceAttachmentId (idempotency), then by document number, then by dates
    let existingBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: attachment.foreignerId, sourceAttachmentId: attachment.id, typ: docType },
    });
    if (!existingBase && docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: attachment.foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
      });
    } else if (!existingBase && docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: attachment.foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
      });
    }
    // Fallback: match by exact dates (both must be present and match)
    if (!existingBase && parsed.dataOd && parsed.dataDo) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: {
          foreignerId: attachment.foreignerId,
          typ: docType,
          dataOd: new Date(parsed.dataOd),
          dataDo: new Date(parsed.dataDo),
        },
      });
    }

    // Build type-specific data
    const baseData: Record<string, unknown> = {
      foreignerId: attachment.foreignerId,
      typ: docType,
      status: "BRAK_DANYCH",
      sourceAttachmentId: attachment.id,
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
      rodzajUmowy: parsed.rodzajUmowy || null,
      stanowisko: parsed.stanowisko || null,
      przedmiotDziela: parsed.przedmiotDziela || null,
      firma: parsed.firma || null,
    };

    if (docType === "OSWIADCZENIE") {
      baseData.nrOswiadczenia = parsed.nrOswiadczenia || null;
      baseData.podjeciePracy = parsed.rodzajPracy || null;
      baseData.nrDecyzji = null;
    } else {
      // ZEZWOLENIE, KARTA_POBYTU, BLUE_CARD
      baseData.nrDecyzji = parsed.nrDecyzji || null;
      baseData.nrOswiadczenia = null;
    }

    // Store wynagrodzenie — prefer structured format if available
    if (parsed.wynagrodzenie) {
      if (parsed.parsedSalary && !parsed.parsedSalary.podejrzana) {
        // Use formatSalary for clean display
        const { formatSalary } = await import("@/lib/pdf-parser");
        baseData.wynagrodzenie = formatSalary(parsed.parsedSalary);
      } else {
        baseData.wynagrodzenie = parsed.wynagrodzenie;
      }
    }

    let baseId: number;
    let scrapeAction: string;
    if (existingBase) {
      // Only update fields that have new non-null values — never null-out existing data
      const updateFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(baseData)) {
        if (key === "foreignerId") continue; // skip FK
        if (value !== null && value !== undefined) {
          updateFields[key] = value;
        }
      }
      await db.fdkEmploymentBase.update({
        where: { id: existingBase.id },
        data: updateFields,
      });
      baseId = existingBase.id;
      scrapeAction = `Zaktualizowano podstawę zatrudnienia #${baseId} (${docType}) na podstawie pliku: ${attachment.nazwaPliku}`;
    } else {
      const base = await db.fdkEmploymentBase.create({ data: baseData as never });
      baseId = base.id;
      scrapeAction = `Utworzono podstawę zatrudnienia #${baseId} (${docType}) na podstawie pliku: ${attachment.nazwaPliku}`;
    }

    // Log the scrape action to history
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy,
        field: "scrape",
        oldValue: null,
        newValue: scrapeAction,
      },
    });

    // For residence permits (TRC/Blue Card): update decyzjaPobytowaDo + deactivate previous active permits
    const isResidencePermit = docType === "KARTA_POBYTU" || docType === "BLUE_CARD" || docType.startsWith("TRC_")
      || ["POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA", "ZGODA_HUMANITARNA", "OBYWATEL_UE", "UMOWA_WYSTAPIENIA", "WIZA", "RUCH_BEZWIZOWY", "POBYT_NA_PRZEDLUZENIU", "PESEL_UKR", "POBYT_CUKR"].includes(docType as string);
    if (isResidencePermit && parsed.dataDo) {
      const dataDo = new Date(parsed.dataDo);
      if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({
          where: { id: attachment.foreignerId },
          data: { decyzjaPobytowaDo: dataDo },
        });
      }
      // Deactivate other active residence permits — only one can be active
      await deactivatePreviousResidencePermits(attachment.foreignerId, baseId, changedBy);
    }

    // --- v2: Create FdkResidenceBasis for documents that have a residence component ---
    let residenceBaseId: number | null = null;
    try {
      // Map parser's detectedType to v2 residence/employment types
      const typeMapping = mapDetectedTypeToBaseTypes(parsed.detectedType, parsed.firma);

      const residenceType = typeMapping.residenceType;
      if (residenceType && residenceType !== "UNKNOWN") {
        // Check if valid FdkBaseType
        const validResidenceType = residenceType as import("@prisma/client").FdkBaseType;

        // Match existing residence base (idempotency)
        let existingResidence = await db.fdkResidenceBasis.findFirst({
          where: { foreignerId: attachment.foreignerId, sourceAttachmentId: attachment.id, typ: validResidenceType },
        });
        if (!existingResidence && parsed.nrDecyzji) {
          existingResidence = await db.fdkResidenceBasis.findFirst({
            where: { foreignerId: attachment.foreignerId, typ: validResidenceType, nrDecyzji: parsed.nrDecyzji },
          });
        }

        const residenceData: Record<string, unknown> = {
          foreignerId: attachment.foreignerId,
          typ: validResidenceType,
          status: "BRAK_DANYCH",
          sourceAttachmentId: attachment.id,
          dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
          dataDo: typeMapping.isIndefinite ? null : (parsed.dataDo ? new Date(parsed.dataDo) : null),
          nrDecyzji: parsed.nrDecyzji || null,
          urzad: null, // TODO: extract from header
          confidence: null,
          flags: typeMapping.flags.length > 0 ? JSON.stringify(typeMapping.flags) : "[]",
        };

        if (existingResidence) {
          const updateFields: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(residenceData)) {
            if (key === "foreignerId") continue;
            if (value !== null && value !== undefined) updateFields[key] = value;
          }
          await db.fdkResidenceBasis.update({
            where: { id: existingResidence.id },
            data: updateFields,
          });
          residenceBaseId = existingResidence.id;
        } else {
          const rb = await db.fdkResidenceBasis.create({ data: residenceData as never });
          residenceBaseId = rb.id;
        }

        await db.fdkChangeLog.create({
          data: {
            foreignerId: attachment.foreignerId,
            changedBy,
            field: "residence_base",
            oldValue: null,
            newValue: `${existingResidence ? "Zaktualizowano" : "Utworzono"} podstawę pobytu #${residenceBaseId} (${validResidenceType}) z pliku: ${attachment.nazwaPliku}`,
          },
        });
      }
    } catch (rbErr) {
      // Non-fatal: residence basis creation failure shouldn't block employment base
      console.error(`[scrape] Residence basis creation error for attachment ${id}: ${rbErr}`);
    }

    // Pre-write checks already ran above (blockingIssues); reuse preWriteIssues for warnings
    // Build list of fields that could NOT be extracted (for user feedback)
    const expectedFields = ["detectedType", "dataOd", "dataDo", "imie", "nazwisko"];
    const missingFields = expectedFields.filter((f) => !parsed[f as keyof typeof parsed]);

    // Build warnings
    const warnings: string[] = [];
    if (missingFields.length > 0) {
      warnings.push(`Nie udało się odczytać: ${missingFields.join(", ")}. Uzupełnij brakujące dane ręcznie.`);
    }
    if (parsed.parsedSalary?.podejrzana) {
      warnings.push(`Stawka ${parsed.wynagrodzenie} wydaje się podejrzana (zbyt niska). Sprawdź poprawność.`);
    }
    if (parsed.dataOdSource === "data_podpisu") {
      warnings.push(`Data "od" pochodzi z daty podpisu elektronicznego — może nie być datą rozpoczęcia okresu ważności.`);
    }
    // Add non-blocking pre-write check warnings
    for (const issue of preWriteIssues.filter((i) => i.severity === "warning")) {
      warnings.push(`[Kontrola #${issue.checkId}] ${issue.message}`);
    }

    // Check employment/residence consistency
    const hasActiveEmployment = !!baseId;
    const hasActiveResidence = !!residenceBaseId || !!foreigner.decyzjaPobytowaDo;
    const consistencyWarning = checkEmploymentResidenceConsistency(hasActiveResidence, hasActiveEmployment);
    if (consistencyWarning) warnings.push(consistencyWarning);

    return NextResponse.json({
      ok: true,
      extracted: parsed,
      foreignerUpdated: Object.keys(foreignerUpdateData),
      employmentBaseCreated: baseId,
      residenceBaseCreated: residenceBaseId,
      preWriteIssues: preWriteIssues.length > 0 ? preWriteIssues : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      message: warnings.length > 0 ? warnings.join(" ") : undefined,
    });
  }

  // Download — stream file
  const { data, error } = await supabase.storage
    .from("fdk-attachments")
    .download(attachment.storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not download file" },
      { status: 500 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", attachment.typPliku === "pdf" ? "application/pdf" : `image/${attachment.typPliku}`);
  headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.nazwaPliku)}"`);
  if (attachment.rozmiarBytes) {
    headers.set("Content-Length", attachment.rozmiarBytes.toString());
  }

  return new NextResponse(data, { headers });
}

/**
 * POST /api/fdk/attachments/[id]?action=confirm-upload
 *
 * Confirms a presigned upload completed — triggers text-layer parsing (no OCR).
 * Called after the client uploads a large file directly to Supabase Storage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const action = request.nextUrl.searchParams.get("action");
  if (action !== "confirm-upload") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const attachment = await db.fdkAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only run text-layer parsing for PDFs (no OCR — user can trigger via Scrape button)
  let extracted = null;
  if (attachment.typPliku === "pdf") {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: fileData } = await supabase.storage
        .from("fdk-attachments")
        .download(attachment.storagePath);

      if (fileData) {
        const buffer = await fileData.arrayBuffer();
        const parsed = await parseOswiadczeniePdf(buffer, { ocrFallback: false, filename: attachment.nazwaPliku });
        if (parsed) {
          extracted = parsed;

          // Auto-fill foreigner data
          const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
          if (foreigner) {
            const updateData: Record<string, unknown> = {};
            if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
            if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
            if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
            if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
            if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

            if (Object.keys(updateData).length > 0) {
              await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: updateData });
            }
          }
        }
      }
    } catch (err) {
      console.error("[fdk/confirm-upload] PDF parsing error (non-fatal):", err);
    }
  }

  // Auto-classify folder for confirmed presigned uploads
  if (extracted) {
    const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
    if (foreigner) {
      const extractedFullName = `${extracted.imie ?? ""} ${extracted.nazwisko ?? ""}`.trim();
      const profileFullName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
      const isDiffPerson = extractedFullName.length > 2
        && profileFullName.length > 2
        && foreigner.nazwisko !== "Nowy"
        && !namesMatch(extractedFullName, profileFullName);
      const folder = classifyToFolder(extracted.detectedType ?? null, isDiffPerson, attachment.nazwaPliku, attachment.kategoria);
      await db.fdkAttachment.update({
        where: { id: attachment.id },
        data: { folder, detectedType: extracted.detectedType ?? null },
      });
    }
  } else {
    // No extraction — classify by filename only
    const folder = classifyToFolder(null, false, attachment.nazwaPliku, attachment.kategoria);
    await db.fdkAttachment.update({
      where: { id: attachment.id },
      data: { folder },
    });
  }

  return NextResponse.json({
    ok: true,
    id: attachment.id,
    extracted,
    message: attachment.typPliku !== "pdf"
      ? "Plik wgrany. Uzyj przycisku Zescrapuj dane aby odczytac tresc dokumentu."
      : extracted
        ? undefined
        : "Plik wgrany (brak warstwy tekstowej). Uzyj przycisku Zescrapuj dane aby uruchomic OCR.",
  });
}

/**
 * PATCH /api/fdk/attachments/[id]
 *
 * Update attachment folder / subfolder / extraFolders manually.
 * Body: {
 *   folder?: "wazne"|"trc"|"oswiadczenie"|"zezwolenie"|"dokumenty_rodziny"|"inne_dokumenty"
 *   subfolder?: string          — person name for dokumenty_rodziny sub-grouping
 *   addExtraFolder?: string     — add a folder tag (e.g. "wazne" for final declarations)
 *   removeExtraFolder?: string  — remove a folder tag
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const { folder, subfolder, addExtraFolder, removeExtraFolder } = body;

  const VALID_FOLDERS = ["wazne", "trc", "oswiadczenie", "zezwolenie", "dokumenty_rodziny", "inne_dokumenty"];

  const attachment = await db.fdkAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (folder !== undefined) {
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: `folder must be one of: ${VALID_FOLDERS.join(", ")}` }, { status: 400 });
    }
    updateData.folder = folder;
    updateData.folderManual = true;
  }

  if (subfolder !== undefined) {
    updateData.subfolder = subfolder || null;
  }

  if (addExtraFolder !== undefined) {
    if (!VALID_FOLDERS.includes(addExtraFolder)) {
      return NextResponse.json({ error: `addExtraFolder must be one of: ${VALID_FOLDERS.join(", ")}` }, { status: 400 });
    }
    const current = attachment.extraFolders ?? [];
    if (!current.includes(addExtraFolder)) {
      updateData.extraFolders = [...current, addExtraFolder];
    }
  }

  if (removeExtraFolder !== undefined) {
    const current = attachment.extraFolders ?? [];
    updateData.extraFolders = current.filter((f: string) => f !== removeExtraFolder);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.fdkAttachment.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true });
}
