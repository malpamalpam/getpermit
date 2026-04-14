/**
 * Multilang HTML email templates dla powiadomień panelu klienta.
 *
 * Wszystkie templaty są minimalistycznymi HTML-ami inline-stylowanymi —
 * brak React Email, brak build step. Treść w 4 lokalach (PL/EN/RU/UK).
 */

import { siteConfig } from "@/config/site";

export type EmailLocale = "pl" | "en" | "ru" | "uk";

interface EmailContent {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
}

const T: Record<
  | "caseStatusChanged"
  | "newEvent"
  | "newDocument"
  | "clientInvitation"
  | "newMessageFromAdmin"
  | "newMessageFromClient"
  | "documentVerified"
  | "documentNeedsCorrection"
  | "newClientDocument",
  Record<EmailLocale, EmailContent>
> = {
  caseStatusChanged: {
    pl: {
      subject: "Zmiana statusu Twojej sprawy — getpermit.pl",
      preheader: "Twoja sprawa ma nowy status.",
      heading: "Zmiana statusu sprawy",
      body: "Status Twojej sprawy „{caseTitle}\u201d został zmieniony na: <strong>{statusLabel}</strong>. Zaloguj się do panelu, aby zobaczyć szczegóły.",
      ctaLabel: "Zobacz sprawę",
    },
    en: {
      subject: "Your case status has changed — getpermit.pl",
      preheader: "Your case has a new status.",
      heading: "Case status updated",
      body: "Your case \"{caseTitle}\" status has changed to: <strong>{statusLabel}</strong>. Sign in to your panel to see the details.",
      ctaLabel: "View case",
    },
    ru: {
      subject: "Статус вашего дела изменён — getpermit.pl",
      preheader: "У вашего дела новый статус.",
      heading: "Статус дела обновлён",
      body: "Статус вашего дела «{caseTitle}» изменён на: <strong>{statusLabel}</strong>. Войдите в панель, чтобы увидеть подробности.",
      ctaLabel: "Открыть дело",
    },
    uk: {
      subject: "Статус вашої справи змінено — getpermit.pl",
      preheader: "У вашої справи новий статус.",
      heading: "Статус справи оновлено",
      body: "Статус вашої справи «{caseTitle}» змінено на: <strong>{statusLabel}</strong>. Увійдіть до панелі, щоб переглянути деталі.",
      ctaLabel: "Відкрити справу",
    },
  },
  newEvent: {
    pl: {
      subject: "Nowe wydarzenie w Twojej sprawie — getpermit.pl",
      preheader: "W Twojej sprawie pojawiło się nowe wydarzenie.",
      heading: "Nowe wydarzenie",
      body: "W sprawie „{caseTitle}\u201d dodano nowe wydarzenie: <strong>{eventTitle}</strong>. Zaloguj się, aby zobaczyć szczegóły i timeline.",
      ctaLabel: "Zobacz timeline",
    },
    en: {
      subject: "New event in your case — getpermit.pl",
      preheader: "A new event was added to your case.",
      heading: "New event",
      body: "A new event was added to case \"{caseTitle}\": <strong>{eventTitle}</strong>. Sign in to see the details and timeline.",
      ctaLabel: "View timeline",
    },
    ru: {
      subject: "Новое событие по вашему делу — getpermit.pl",
      preheader: "В ваше дело добавлено новое событие.",
      heading: "Новое событие",
      body: "В деле «{caseTitle}» добавлено новое событие: <strong>{eventTitle}</strong>. Войдите, чтобы увидеть подробности и историю.",
      ctaLabel: "Посмотреть историю",
    },
    uk: {
      subject: "Нова подія у вашій справі — getpermit.pl",
      preheader: "До вашої справи додано нову подію.",
      heading: "Нова подія",
      body: "До справи «{caseTitle}» додано нову подію: <strong>{eventTitle}</strong>. Увійдіть, щоб переглянути деталі та історію.",
      ctaLabel: "Переглянути історію",
    },
  },
  newDocument: {
    pl: {
      subject: "Nowy dokument w Twojej sprawie — getpermit.pl",
      preheader: "Konsultant dodał nowy dokument do Twojej sprawy.",
      heading: "Nowy dokument",
      body: "W sprawie „{caseTitle}\u201d pojawił się nowy dokument: <strong>{fileName}</strong>. Zaloguj się, aby go pobrać.",
      ctaLabel: "Pobierz dokument",
    },
    en: {
      subject: "New document in your case — getpermit.pl",
      preheader: "Your case manager uploaded a new document.",
      heading: "New document",
      body: "A new document was added to case \"{caseTitle}\": <strong>{fileName}</strong>. Sign in to download it.",
      ctaLabel: "Download document",
    },
    ru: {
      subject: "Новый документ по вашему делу — getpermit.pl",
      preheader: "Менеджер загрузил новый документ в ваше дело.",
      heading: "Новый документ",
      body: "В деле «{caseTitle}» появился новый документ: <strong>{fileName}</strong>. Войдите, чтобы скачать его.",
      ctaLabel: "Скачать документ",
    },
    uk: {
      subject: "Новий документ у вашій справі — getpermit.pl",
      preheader: "Менеджер завантажив новий документ.",
      heading: "Новий документ",
      body: "До справи «{caseTitle}» додано новий документ: <strong>{fileName}</strong>. Увійдіть, щоб завантажити.",
      ctaLabel: "Завантажити документ",
    },
  },
  newMessageFromAdmin: {
    pl: {
      subject: "Nowa wiadomość od opiekuna — getpermit.pl",
      preheader: "Otrzymałeś nową wiadomość od opiekuna Twojej sprawy.",
      heading: "Nowa wiadomość",
      body: "Otrzymałeś nową wiadomość od opiekuna Twojej sprawy \u201e{caseTitle}\u201d. Zaloguj się do panelu, aby ją przeczytać.",
      ctaLabel: "Przeczytaj wiadomość",
    },
    en: {
      subject: "New message from your case manager — getpermit.pl",
      preheader: "You have a new message from your case manager.",
      heading: "New message",
      body: "You have a new message regarding your case \"{caseTitle}\". Sign in to your panel to read it.",
      ctaLabel: "Read message",
    },
    ru: {
      subject: "Новое сообщение от менеджера — getpermit.pl",
      preheader: "Вы получили новое сообщение от менеджера вашего дела.",
      heading: "Новое сообщение",
      body: "Вы получили новое сообщение по делу «{caseTitle}». Войдите в панель, чтобы прочитать его.",
      ctaLabel: "Прочитать сообщение",
    },
    uk: {
      subject: "Нове повідомлення від менеджера — getpermit.pl",
      preheader: "Ви отримали нове повідомлення від менеджера вашої справи.",
      heading: "Нове повідомлення",
      body: "Ви отримали нове повідомлення щодо справи «{caseTitle}». Увійдіть до панелі, щоб прочитати.",
      ctaLabel: "Прочитати повідомлення",
    },
  },
  newMessageFromClient: {
    pl: {
      subject: "Nowa wiadomość od klienta — getpermit.pl",
      preheader: "Klient wysłał nową wiadomość w sprawie.",
      heading: "Nowa wiadomość od klienta",
      body: "Klient <strong>{clientName}</strong> wysłał nową wiadomość w sprawie \u201e{caseTitle}\u201d. Zaloguj się do panelu administratora, aby odpowiedzieć.",
      ctaLabel: "Odpowiedz",
    },
    en: {
      subject: "New message from client — getpermit.pl",
      preheader: "A client sent a new message in a case.",
      heading: "New message from client",
      body: "Client <strong>{clientName}</strong> sent a new message in case \"{caseTitle}\". Sign in to the admin panel to reply.",
      ctaLabel: "Reply",
    },
    ru: {
      subject: "Новое сообщение от клиента — getpermit.pl",
      preheader: "Клиент отправил новое сообщение по делу.",
      heading: "Новое сообщение от клиента",
      body: "Клиент <strong>{clientName}</strong> отправил новое сообщение по делу «{caseTitle}». Войдите в панель администратора, чтобы ответить.",
      ctaLabel: "Ответить",
    },
    uk: {
      subject: "Нове повідомлення від клієнта — getpermit.pl",
      preheader: "Клієнт надіслав нове повідомлення у справі.",
      heading: "Нове повідомлення від клієнта",
      body: "Клієнт <strong>{clientName}</strong> надіслав нове повідомлення у справі «{caseTitle}». Увійдіть до панелі адміністратора, щоб відповісти.",
      ctaLabel: "Відповісти",
    },
  },
  documentVerified: {
    pl: {
      subject: "Dokument zweryfikowany — getpermit.pl",
      preheader: "Twój dokument został zweryfikowany.",
      heading: "Dokument zweryfikowany",
      body: "Administrator sprawdził Twój dokument <strong>{fileName}</strong> w sprawie \u201e{caseTitle}\u201d. Status: <strong>zweryfikowany</strong>.",
      ctaLabel: "Zobacz sprawę",
    },
    en: {
      subject: "Document verified — getpermit.pl",
      preheader: "Your document has been verified.",
      heading: "Document verified",
      body: "Your document <strong>{fileName}</strong> in case \"{caseTitle}\" has been verified.",
      ctaLabel: "View case",
    },
    ru: {
      subject: "Документ проверен — getpermit.pl",
      preheader: "Ваш документ прошёл проверку.",
      heading: "Документ проверен",
      body: "Ваш документ <strong>{fileName}</strong> в деле «{caseTitle}» прошёл проверку.",
      ctaLabel: "Открыть дело",
    },
    uk: {
      subject: "Документ перевірено — getpermit.pl",
      preheader: "Ваш документ пройшов перевірку.",
      heading: "Документ перевірено",
      body: "Ваш документ <strong>{fileName}</strong> у справі «{caseTitle}» пройшов перевірку.",
      ctaLabel: "Відкрити справу",
    },
  },
  documentNeedsCorrection: {
    pl: {
      subject: "Dokument wymaga poprawy — getpermit.pl",
      preheader: "Twój dokument wymaga poprawy.",
      heading: "Dokument wymaga poprawy",
      body: "Administrator sprawdził Twój dokument <strong>{fileName}</strong> w sprawie \u201e{caseTitle}\u201d. Status: <strong>wymaga poprawy</strong>. Zaloguj się, aby zobaczyć szczegóły i przesłać poprawiony dokument.",
      ctaLabel: "Zobacz sprawę",
    },
    en: {
      subject: "Document needs correction — getpermit.pl",
      preheader: "Your document needs correction.",
      heading: "Document needs correction",
      body: "Your document <strong>{fileName}</strong> in case \"{caseTitle}\" needs correction. Sign in to see details and upload a corrected version.",
      ctaLabel: "View case",
    },
    ru: {
      subject: "Документ требует исправления — getpermit.pl",
      preheader: "Ваш документ требует исправления.",
      heading: "Документ требует исправления",
      body: "Ваш документ <strong>{fileName}</strong> в деле «{caseTitle}» требует исправления. Войдите, чтобы увидеть подробности и загрузить исправленную версию.",
      ctaLabel: "Открыть дело",
    },
    uk: {
      subject: "Документ потребує виправлення — getpermit.pl",
      preheader: "Ваш документ потребує виправлення.",
      heading: "Документ потребує виправлення",
      body: "Ваш документ <strong>{fileName}</strong> у справі «{caseTitle}» потребує виправлення. Увійдіть, щоб переглянути деталі та завантажити виправлену версію.",
      ctaLabel: "Відкрити справу",
    },
  },
  newClientDocument: {
    pl: {
      subject: "Nowy dokument od klienta — getpermit.pl",
      preheader: "Klient załączył nowy dokument do sprawy.",
      heading: "Nowy dokument od klienta",
      body: "Klient <strong>{clientName}</strong> załączył nowy dokument do sprawy \u201e{caseTitle}\u201d: <strong>{fileName}</strong> ({documentType}).",
      ctaLabel: "Zobacz dokumenty",
    },
    en: {
      subject: "New document from client — getpermit.pl",
      preheader: "A client uploaded a new document to a case.",
      heading: "New document from client",
      body: "Client <strong>{clientName}</strong> uploaded a new document to case \"{caseTitle}\": <strong>{fileName}</strong> ({documentType}).",
      ctaLabel: "View documents",
    },
    ru: {
      subject: "Новый документ от клиента — getpermit.pl",
      preheader: "Клиент загрузил новый документ в дело.",
      heading: "Новый документ от клиента",
      body: "Клиент <strong>{clientName}</strong> загрузил новый документ в дело «{caseTitle}»: <strong>{fileName}</strong> ({documentType}).",
      ctaLabel: "Посмотреть документы",
    },
    uk: {
      subject: "Новий документ від клієнта — getpermit.pl",
      preheader: "Клієнт завантажив новий документ до справи.",
      heading: "Новий документ від клієнта",
      body: "Клієнт <strong>{clientName}</strong> завантажив новий документ до справи «{caseTitle}»: <strong>{fileName}</strong> ({documentType}).",
      ctaLabel: "Переглянути документи",
    },
  },
  clientInvitation: {
    pl: {
      subject: "Zaproszenie do panelu klienta — getpermit.pl",
      preheader: "Zostałeś zaproszony do panelu klienta fundacji.",
      heading: "Witamy w getpermit.pl",
      body: "{firstName}, zostałeś zaproszony do panelu klienta. Kliknij przycisk poniżej, aby się zalogować i zobaczyć swoje sprawy.",
      ctaLabel: "Zaloguj się do panelu",
    },
    en: {
      subject: "Invitation to client panel — getpermit.pl",
      preheader: "You've been invited to the client panel.",
      heading: "Welcome to getpermit.pl",
      body: "{firstName}, you've been invited to the client panel. Click the button below to sign in and view your cases.",
      ctaLabel: "Sign in to panel",
    },
    ru: {
      subject: "Приглашение в панель клиента — getpermit.pl",
      preheader: "Вас пригласили в панель клиента.",
      heading: "Добро пожаловать в getpermit.pl",
      body: "{firstName}, вас пригласили в панель клиента. Нажмите кнопку ниже, чтобы войти и увидеть ваши дела.",
      ctaLabel: "Войти в панель",
    },
    uk: {
      subject: "Запрошення до панелі клієнта — getpermit.pl",
      preheader: "Вас запросили до панелі клієнта.",
      heading: "Ласкаво просимо до getpermit.pl",
      body: "{firstName}, вас запросили до панелі клієнта. Натисніть кнопку нижче, щоб увійти та побачити ваші справи.",
      ctaLabel: "Увійти до панелі",
    },
  },
};

function pickLocale(locale: string): EmailLocale {
  if (locale === "en" || locale === "ru" || locale === "uk") return locale;
  return "pl";
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function wrapHtml({
  preheader,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
        <tr><td style="padding:32px 40px 16px;">
          <div style="font-size:20px;font-weight:800;color:#0f1b33;">get<span style="color:#2563eb;">permit</span>.pl</div>
        </td></tr>
        <tr><td style="padding:0 40px 24px;">
          <h1 style="margin:16px 0 12px;font-size:22px;font-weight:800;color:#0f1b33;">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#404657;">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #f0f0f3;">
          <p style="margin:0;font-size:12px;color:#999;">${siteConfig.legalName} · ${siteConfig.contact.email}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

interface BaseParams {
  locale: string;
  caseUrl: string;
}

export function buildCaseStatusChangedEmail(params: BaseParams & {
  caseTitle: string;
  statusLabel: string;
}) {
  const t = T.caseStatusChanged[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        statusLabel: params.statusLabel,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildNewEventEmail(params: BaseParams & {
  caseTitle: string;
  eventTitle: string;
}) {
  const t = T.newEvent[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        eventTitle: params.eventTitle,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildNewDocumentEmail(params: BaseParams & {
  caseTitle: string;
  fileName: string;
}) {
  const t = T.newDocument[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        fileName: params.fileName,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildNewMessageFromAdminEmail(params: BaseParams & {
  caseTitle: string;
}) {
  const t = T.newMessageFromAdmin[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, { caseTitle: params.caseTitle }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildNewMessageFromClientEmail(params: {
  locale: string;
  caseTitle: string;
  clientName: string;
  adminUrl: string;
}) {
  const t = T.newMessageFromClient[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        clientName: params.clientName,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.adminUrl,
    }),
  };
}

export function buildDocumentVerifiedEmail(params: BaseParams & {
  caseTitle: string;
  fileName: string;
}) {
  const t = T.documentVerified[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        fileName: params.fileName,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildDocumentNeedsCorrectionEmail(params: BaseParams & {
  caseTitle: string;
  fileName: string;
}) {
  const t = T.documentNeedsCorrection[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        fileName: params.fileName,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.caseUrl,
    }),
  };
}

export function buildNewClientDocumentEmail(params: {
  locale: string;
  caseTitle: string;
  clientName: string;
  fileName: string;
  documentType: string;
  adminUrl: string;
}) {
  const t = T.newClientDocument[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, {
        caseTitle: params.caseTitle,
        clientName: params.clientName,
        fileName: params.fileName,
        documentType: params.documentType,
      }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.adminUrl,
    }),
  };
}

export function buildClientInvitationEmail(params: {
  locale: string;
  firstName: string;
  panelUrl: string;
}) {
  const t = T.clientInvitation[pickLocale(params.locale)];
  return {
    subject: t.subject,
    html: wrapHtml({
      preheader: t.preheader,
      heading: t.heading,
      body: interpolate(t.body, { firstName: params.firstName }),
      ctaLabel: t.ctaLabel,
      ctaUrl: params.panelUrl,
    }),
  };
}
