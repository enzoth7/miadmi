import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://uy.dolarapi.com/v1/cotizaciones", {
      next: { revalidate: 300 }, // opcional: cache 5 min
    });

    if (!res.ok) {
      throw new Error("Error al obtener las cotizaciones");
    }

    const data = await res.json();

    const importantes = ["USD", "EUR", "BRL", "ARS", "UI"];
    const filtradas = data.filter((c: any) => importantes.includes(c.moneda));

    return NextResponse.json(filtradas);
  } catch (error) {
    console.error("Error en /api/cotizaciones:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las cotizaciones" },
      { status: 500 }
    );
  }
}
