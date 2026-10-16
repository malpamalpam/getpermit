"use client";

export function CookieResetButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.localStorage.removeItem("getpermit-cookie-consent");
        window.location.reload();
      }}
      className="hover:text-white"
    >
      Ustawienia cookies
    </button>
  );
}
