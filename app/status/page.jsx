export const metadata = {
  title: "Estado del servicio - Mi Admi",
};

export default function StatusPage() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl shadow-black/30">
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Estado del servicio</h1>
      <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm">
        <p className="text-emerald-200 font-semibold">Funcionando con normalidad</p>
        <p className="mt-1 text-white/80">
          No se registran incidentes. Actualizaremos esta página si surge algún inconveniente general.
        </p>
      </div>
    </section>
  );
}
