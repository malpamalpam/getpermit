export function pushEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function trackFormSubmit(formName: string, service?: string, locale?: string) {
  pushEvent("form_submit", {
    form_name: formName,
    form_location: window.location.pathname,
    form_service: service,
    form_language: locale,
  });
}

export function trackFormError(formName: string, errorMessage: string) {
  pushEvent("form_error", {
    form_name: formName,
    form_location: window.location.pathname,
    error_message: errorMessage,
  });
}

export function trackFormStart(formName: string) {
  pushEvent("form_start", {
    form_name: formName,
    form_location: window.location.pathname,
  });
}

export function trackCTA(ctaName: string) {
  pushEvent("cta_click", {
    cta_name: ctaName,
    cta_page: window.location.pathname,
  });
}
