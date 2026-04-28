import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "getpermit.pl — Legalizacja pobytu i pracy w Polsce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* GP Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 120,
            fontWeight: 800,
            color: "#38bdf8",
            letterSpacing: "-4px",
            marginBottom: 24,
          }}
        >
          GP
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
            marginBottom: 16,
          }}
        >
          getpermit.pl
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 48,
          }}
        >
          Legalizacja pobytu i pracy w Polsce
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 80,
            padding: "24px 48px",
            borderRadius: 16,
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#38bdf8" }}>10+</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>lat doświadczenia</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#38bdf8" }}>5000+</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>obsłużonych klientów</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#38bdf8" }}>98%</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>skuteczności</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
