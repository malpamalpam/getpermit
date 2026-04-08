import type { ReactNode } from "react";

/**
 * Layout panelu klienta. Renderowany w obrębie [locale]/layout.tsx, który już
 * dostarcza Header/Footer marketingowy. W panelu chcemy minimalistyczny widok,
 * dlatego ten layout jest tylko semantycznym wrapperem (Header/Footer pokażą się
 * nadal — to jest świadoma decyzja, żeby klient miał szybki dostęp do strony
 * głównej i języka).
 *
 * Można rozważyć w v2 odcięcie marketingowego layoutu poprzez (panel) route group
 * z osobnym (panel)/layout.tsx zastępującym [locale]/layout.tsx.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100vh-4rem)] bg-surface">{children}</div>;
}
