/**
 * Mapa zdjęć hero dla podstron usług.
 * Źródło: Unsplash (darmowe komercyjnie).
 *
 * TODO: zamień na własne zdjęcia biura/zespołu UTM Group.
 * Nawet 2-3 autentyczne fotografie znacząco podniosą wiarygodność.
 * Umieść oryginały w /public/images/services/{slug}/hero.webp
 * i zaktualizuj src w mapie poniżej.
 */

export interface ServiceImage {
  src: string;
  alt: Record<string, string>;
  credit: string; // Unsplash photographer
}

export const SERVICE_HERO_IMAGES: Record<string, ServiceImage> = {
  // Legalizacja pracy
  "zezwolenie-na-prace": {
    src: "/images/services/zezwolenie-na-prace-getpermit.jpg",
    alt: {
      pl: "Zezwolenie na pracę w Polsce — dokumenty i konsultacja prawna",
      en: "Work permit in Poland — documents and legal consultation",
      ru: "Разрешение на работу в Польше — документы и юридическая консультация",
      uk: "Дозвіл на роботу в Польщі — документи та юридична консультація",
    },
    credit: "Unsplash / Cytonn Photography",
  },
  "oswiadczenie-o-powierzeniu-pracy": {
    src: "/images/services/oswiadczenie-o-powierzeniu-pracy-getpermit.jpg",
    alt: {
      pl: "Oświadczenie o powierzeniu pracy cudzoziemcowi — pomoc prawna",
      en: "Declaration of entrusting work to a foreigner — legal assistance",
      ru: "Заявление о поручении работы иностранцу — правовая помощь",
      uk: "Заява про доручення роботи іноземцю — правова допомога",
    },
    credit: "Unsplash / Scott Graham",
  },

  // Legalizacja pobytu
  "karta-pobytu-czasowego": {
    src: "/images/services/karta-pobytu-czasowego-getpermit.jpg",
    alt: {
      pl: "Karta pobytu czasowego w Polsce — profesjonalna pomoc prawna getpermit.pl",
      en: "Temporary residence card in Poland — professional legal help",
      ru: "Карта временного проживания в Польше — профессиональная юридическая помощь",
      uk: "Карта тимчасового проживання в Польщі — професійна юридична допомога",
    },
    credit: "Unsplash / LinkedIn Sales Solutions",
  },
  "zezwolenie-na-pobyt-czasowy-i-prace": {
    src: "/images/services/zezwolenie-pobyt-czasowy-i-praca-getpermit.jpg",
    alt: {
      pl: "Zezwolenie na pobyt czasowy i pracę — kompleksowa obsługa",
      en: "Temporary residence and work permit — comprehensive service",
      ru: "Разрешение на временное проживание и работу — комплексное обслуживание",
      uk: "Дозвіл на тимчасове проживання та роботу — комплексне обслуговування",
    },
    credit: "Unsplash / Christina @ wocintechchat.com",
  },
  "eu-blue-card": {
    src: "/images/services/eu-blue-card-getpermit.jpg",
    alt: {
      pl: "EU Blue Card — Niebieska Karta UE dla specjalistów w Polsce",
      en: "EU Blue Card for specialists in Poland",
      ru: "Голубая карта ЕС для специалистов в Польше",
      uk: "Блакитна карта ЄС для спеціалістів у Польщі",
    },
    credit: "Unsplash / ThisisEngineering",
  },
  "wymiana-karty-pobytu": {
    src: "/images/services/wymiana-karty-pobytu-getpermit.jpg",
    alt: {
      pl: "Wymiana karty pobytu — dokumenty i procedura",
      en: "Residence card exchange — documents and procedure",
      ru: "Обмен карты побыту — документы и процедура",
      uk: "Обмін карти побуту — документи та процедура",
    },
    credit: "Unsplash / Helloquence",
  },

  // Pobyty długoterminowe
  "rezydent-dlugoterminowy-ue": {
    src: "/images/services/rezydent-dlugoterminowy-ue-getpermit.jpg",
    alt: {
      pl: "Rezydent długoterminowy UE — status pobytowy w Polsce",
      en: "EU long-term resident — residence status in Poland",
      ru: "Долгосрочный резидент ЕС — статус проживания в Польше",
      uk: "Довгостроковий резидент ЄС — статус проживання в Польщі",
    },
    credit: "Unsplash / Dylan Gillis",
  },
  "karta-stalego-pobytu": {
    src: "/images/services/karta-stalego-pobytu-getpermit.jpg",
    alt: {
      pl: "Pobyt stały w Polsce — karta stałego pobytu dla cudzoziemców",
      en: "Permanent residence in Poland — permanent residence card for foreigners",
      ru: "Постоянное проживание в Польше — карта постоянного проживания",
      uk: "Постійне проживання в Польщі — карта постійного проживання",
    },
    credit: "Unsplash / Tyler Nix",
  },

  // Procedura odwoławcza
  "ponaglenia-i-odwolania": {
    src: "/images/services/ponaglenia-i-odwolania-getpermit.jpg",
    alt: {
      pl: "Ponaglenia i odwołania — procedura prawna w sprawach pobytowych",
      en: "Urgency complaints and appeals — legal procedure in residence cases",
      ru: "Обжалование и ускорение — правовая процедура в делах о проживании",
      uk: "Оскарження та прискорення — правова процедура у справах проживання",
    },
    credit: "Unsplash / Tingey Injury Law Firm",
  },

  // Tłumaczenia
  "tlumaczenia-przysiegle": {
    src: "/images/services/tlumaczenia-przysiegle-getpermit.jpg",
    alt: {
      pl: "Tłumaczenia przysięgłe dokumentów — certyfikowany tłumacz",
      en: "Sworn document translations — certified translator",
      ru: "Присяжный перевод документов — сертифицированный переводчик",
      uk: "Присяжний переклад документів — сертифікований перекладач",
    },
    credit: "Unsplash / Patrick Tomasso",
  },

  // B2B Inkubator
  "legalizacja-b2b-inkubator": {
    src: "/images/services/zezwolenie-na-prace-getpermit.jpg",
    alt: {
      pl: "Legalizacja na podstawie umowy B2B w inkubatorze przedsiębiorczości",
      en: "Legalization via B2B contract in a business incubator",
      ru: "Легализация на основе договора B2B в бизнес-инкубаторе",
      uk: "Легалізація на основі договору B2B у бізнес-інкубаторі",
    },
    credit: "Unsplash / Cytonn Photography",
  },
  "legalizacja-pracy-b2b-inkubator": {
    src: "/images/services/zezwolenie-na-prace-getpermit.jpg",
    alt: {
      pl: "Legalizacja pracy na podstawie umowy B2B w inkubatorze przedsiębiorczości",
      en: "Work legalization via B2B contract in a business incubator",
      ru: "Легализация работы на основе договора B2B в бизнес-инкубаторе",
      uk: "Легалізація роботи на основі договору B2B у бізнес-інкубаторі",
    },
    credit: "Unsplash / Cytonn Photography",
  },
  "powiadomienia-o-powierzeniu-pracy": {
    src: "/images/services/oswiadczenie-o-powierzeniu-pracy-getpermit.jpg",
    alt: {
      pl: "Powiadomienia o powierzeniu pracy cudzoziemcowi",
      en: "Notifications of entrusting work to a foreigner",
      ru: "Уведомления о поручении работы иностранцу",
      uk: "Повідомлення про доручення роботи іноземцю",
    },
    credit: "Unsplash / Scott Graham",
  },

  // Dodatkowe
  "obywatelstwo-polskie": {
    src: "/images/services/obywatelstwo-polskie-getpermit.jpg",
    alt: {
      pl: "Obywatelstwo polskie — procedura nadania obywatelstwa",
      en: "Polish citizenship — citizenship procedure",
      ru: "Польское гражданство — процедура получения гражданства",
      uk: "Польське громадянство — процедура отримання громадянства",
    },
    credit: "Unsplash / Mika Baumeister",
  },
};

/** Zwraca obraz hero dla danego slugu usługi. Fallback na domyślny. */
export function getServiceHeroImage(slug: string): ServiceImage {
  return (
    SERVICE_HERO_IMAGES[slug] ?? {
      src: "/images/services/zezwolenie-na-prace-getpermit.jpg",
      alt: {
        pl: "Profesjonalna pomoc prawna w legalizacji pobytu — getpermit.pl",
        en: "Professional legal help with residence legalization — getpermit.pl",
        ru: "Профессиональная юридическая помощь в легализации — getpermit.pl",
        uk: "Професійна юридична допомога в легалізації — getpermit.pl",
      },
      credit: "Unsplash",
    }
  );
}

/** Mapa obrazów dla kategorii na stronie głównej */
export interface CategoryImage {
  src: string;
  alt: Record<string, string>;
}

export const CATEGORY_IMAGES: Record<string, CategoryImage> = {
  "legalizacja-pracy": {
    src: "/images/services/zezwolenie-na-prace-getpermit.jpg",
    alt: {
      pl: "Zezwolenie na prac\u0119 typu A i o\u015bwiadczenie dla cudzoziemc\u00f3w w Polsce",
      en: "Type A work permit and declaration for foreigners in Poland",
      ru: "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443 \u0442\u0438\u043f\u0430 A \u0438 \u0437\u0430\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u0434\u043b\u044f \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0435\u0432 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435",
      uk: "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443 \u0442\u0438\u043f\u0443 A \u0442\u0430 \u0437\u0430\u044f\u0432\u0430 \u0434\u043b\u044f \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u0456\u0432 \u0443 \u041f\u043e\u043b\u044c\u0449\u0456",
    },
  },
  "legalizacja-pobytu": {
    src: "/images/services/karta-pobytu-czasowego-getpermit.jpg",
    alt: {
      pl: "Karta pobytu czasowego i EU Blue Card dla cudzoziemc\u00f3w w Polsce",
      en: "Temporary residence card and EU Blue Card for foreigners in Poland",
      ru: "\u041a\u0430\u0440\u0442\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u0438 EU Blue Card \u0434\u043b\u044f \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0435\u0432 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435",
      uk: "\u041a\u0430\u0440\u0442\u0430 \u0442\u0438\u043c\u0447\u0430\u0441\u043e\u0432\u043e\u0433\u043e \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0442\u0430 EU Blue Card \u0434\u043b\u044f \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u0456\u0432 \u0443 \u041f\u043e\u043b\u044c\u0449\u0456",
    },
  },
  "pobyty-dlugoterminowe": {
    src: "/images/services/karta-stalego-pobytu-getpermit.jpg",
    alt: {
      pl: "Status rezydenta d\u0142ugoterminowego UE i pobyt sta\u0142y w Polsce",
      en: "EU long-term resident status and permanent residence in Poland",
      ru: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043b\u0433\u043e\u0441\u0440\u043e\u0447\u043d\u043e\u0433\u043e \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u0430 \u0415\u0421 \u0438 \u043f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435",
      uk: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u0432\u0433\u043e\u0441\u0442\u0440\u043e\u043a\u043e\u0432\u043e\u0433\u043e \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u0430 \u0404\u0421 \u0442\u0430 \u043f\u043e\u0441\u0442\u0456\u0439\u043d\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0432 \u041f\u043e\u043b\u044c\u0449\u0456",
    },
  },
  "procedura-odwolawcza": {
    src: "/images/services/ponaglenia-i-odwolania-getpermit.jpg",
    alt: {
      pl: "Ponaglenia i odwo\u0142ania od decyzji w sprawach pobytowych",
      en: "Urgency complaints and appeals in residence cases",
      ru: "\u041e\u0431\u0436\u0430\u043b\u043e\u0432\u0430\u043d\u0438\u0435 \u0438 \u0443\u0441\u043a\u043e\u0440\u0435\u043d\u0438\u0435 \u0432 \u0434\u0435\u043b\u0430\u0445 \u043e \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0438",
      uk: "\u041e\u0441\u043a\u0430\u0440\u0436\u0435\u043d\u043d\u044f \u0442\u0430 \u043f\u0440\u0438\u0441\u043a\u043e\u0440\u0435\u043d\u043d\u044f \u0443 \u0441\u043f\u0440\u0430\u0432\u0430\u0445 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f",
    },
  },
  "tlumaczenia-przysiegle": {
    src: "/images/services/tlumaczenia-przysiegle-getpermit.jpg",
    alt: {
      pl: "T\u0142umaczenia przysi\u0119g\u0142e dokument\u00f3w do legalizacji pobytu",
      en: "Sworn translations of documents for residence legalization",
      ru: "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u044b\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0434\u043b\u044f \u043b\u0435\u0433\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438",
      uk: "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u0438\u0439 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0456\u0432 \u0434\u043b\u044f \u043b\u0435\u0433\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u0457",
    },
  },
  "dla-pracodawcow": {
    src: "/images/services/uslugi-dla-pracodawcow-getpermit.jpg",
    alt: {
      pl: "Us\u0142ugi dla pracodawc\u00f3w \u2014 zatrudnianie cudzoziemc\u00f3w w Polsce",
      en: "Services for employers \u2014 hiring foreigners in Poland",
      ru: "\u0423\u0441\u043b\u0443\u0433\u0438 \u0434\u043b\u044f \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u0435\u0439 \u2014 \u043d\u0430\u0435\u043c \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0435\u0432 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435",
      uk: "\u041f\u043e\u0441\u043b\u0443\u0433\u0438 \u0434\u043b\u044f \u0440\u043e\u0431\u043e\u0442\u043e\u0434\u0430\u0432\u0446\u0456\u0432 \u2014 \u043d\u0430\u0439\u043c \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u0456\u0432 \u0432 \u041f\u043e\u043b\u044c\u0449\u0456",
    },
  },
};
