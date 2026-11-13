"use client";

export function CookieResetButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.Cookiebot) {
          window.Cookiebot.renew();
        }
      }}
      className="hover:text-white"
    >
      Ustawienia cookies
    </button>
  );
}
