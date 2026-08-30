import { ImageResponse } from "next/og";

export const alt = "Mi Admi, herramienta financiera para Uruguay";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0b1e3a",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 930 }}>
          <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
            <div
              style={{
                alignItems: "center",
                background: "white",
                borderRadius: 22,
                color: "#0b1e3a",
                display: "flex",
                fontSize: 58,
                fontWeight: 900,
                height: 96,
                justifyContent: "center",
                width: 96,
              }}
            >
              M
            </div>
            <div style={{ color: "#facc15", fontSize: 34, fontWeight: 800 }}>MI ADMI</div>
          </div>
          <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05, marginTop: 42 }}>
            Herramienta financiera para Uruguay
          </div>
          <div style={{ color: "#dbeafe", fontSize: 30, lineHeight: 1.4, marginTop: 28 }}>
            Sueldo, aguinaldo, despido, seguro de desempleo, gastos y ahorro en un solo lugar.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
