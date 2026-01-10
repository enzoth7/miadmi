"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { completeOnboardingForUser } from "../../lib/app-data"
import { supabaseBrowser } from "../../lib/supabaseBrowser"

const LS_GEN = "miadmi:estimacion_general"
const LS_ESP = "miadmi:estimacion_especifica"
const LS_ESTIMABLES = "miadmi:egresos_estimables"
const MODE_KEY = "miadmi:estimacion_mode"


type Branch = "A" | "B" | "C" | null

type Answers = {
  branchAIngreso: number | null
  branchAGastoTotal: number | null
  branchAVivienda: number | null
  branchAAlimentacion: number | null
  branchAServicios: number | null
  branchADeudas: number | null
  branchAOtros: number | null

  branchBIngreso: number | null
  branchBGastoTotal: number | null
  branchBDeudas: number | null

  branchCIngreso: number | null
  branchCVivienda: number | null
  branchCComida: number | null
  branchCTransporte: number | null
  branchCEstilo: number | null

  resumenVivienda: number | null
  resumenAlimentacion: number | null
  resumenServiciosTransporte: number | null
  resumenDeudas: number | null
  resumenOtros: number | null
  resumenIngreso: number | null
}

const initialAnswers: Answers = {
  branchAIngreso: null,
  branchAGastoTotal: null,
  branchAVivienda: null,
  branchAAlimentacion: null,
  branchAServicios: null,
  branchADeudas: null,
  branchAOtros: null,

  branchBIngreso: null,
  branchBGastoTotal: null,
  branchBDeudas: null,

  branchCIngreso: null,
  branchCVivienda: null,
  branchCComida: null,
  branchCTransporte: null,
  branchCEstilo: null,

  resumenVivienda: null,
  resumenAlimentacion: null,
  resumenServiciosTransporte: null,
  resumenDeudas: null,
  resumenOtros: null,
  resumenIngreso: null,
}

const stepsByBranch: Record<Exclude<Branch, null>, string[]> = {
  A: ["branch", "A1", "A2", "A3", "summary"],
  B: ["branch", "B1", "B2", "B3", "summary"],
  C: ["branch", "C1", "C2", "C3", "C4", "C5", "summary"],
}

const ingresoRanges = [
  { label: "Menos de $20.000", value: 18000 },
  { label: "Entre $20.000 y $40.000", value: 30000 },
  { label: "Entre $40.000 y $60.000", value: 50000 },
  { label: "Mas de $60.000", value: 80000 },
]

const ingresoRangesC = [
  { label: "Hasta $20.000", value: 18000 },
  { label: "Entre $20.000 y $40.000", value: 30000 },
  { label: "Más de $40.000", value: 50000 },
]


function toNumber(val: string): number | null {
  if (val === "" || val === null || val === undefined) return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function LogoReveal({ exit }: { exit: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1e3a]">
      <style jsx global>{`
        @keyframes opacity-scale {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          60% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-opacity-scale {
          animation: opacity-scale 0.9s ease-out forwards;
        }
      `}</style>
      <div
        className={[
          "transition-all duration-300 ease-in",
          exit ? "translate-y-[-10px] opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <Image
          src="/logo.png"
          alt="Mi Admi logo"
          width={180}
          height={180}
          priority
          className={[
            "animate-opacity-scale",
            mounted ? "" : "opacity-0 scale-90",
          ].join(" ")}
        />
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [showLogo, setShowLogo] = useState(true)
  const [logoExit, setLogoExit] = useState(false)
  const [step, setStep] = useState(1)
  const [branch, setBranch] = useState<Branch>(null)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [summaryEdited, setSummaryEdited] = useState(false)
  const [completionMessage, setCompletionMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t1 = setTimeout(() => setLogoExit(true), 900)
    const t2 = setTimeout(() => setShowLogo(false), 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const steps = useMemo(() => {
    if (!branch) return ["branch"]
    return stepsByBranch[branch]
  }, [branch])

  useEffect(() => {
    if (step > steps.length) {
      setStep(steps.length)
    }
  }, [step, steps.length])

  const currentStepId = steps[Math.min(step - 1, steps.length - 1)]

  const goNext = () => {
    if (step < steps.length) {
      setStep(step + 1)
    }
  }

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const toSafeNumber = (value: any) => {
    const num = Number(value ?? 0)
    return Number.isFinite(num) ? num : 0
  }

  const setNumberAnswer = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: toNumber(value) }))
  }

  const setAnswerValue = (key: keyof Answers, value: number | null) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const derivedSummary = useMemo(() => {
    if (branch === "A") {
      const total = answers.branchAGastoTotal ?? 0
      const vivienda = answers.branchAVivienda ?? null
      const alimentacion = answers.branchAAlimentacion ?? null
      const servicios = answers.branchAServicios ?? null
      const deudas = answers.branchADeudas ?? null
      const providedSum =
        (vivienda ?? 0) + (alimentacion ?? 0) + (servicios ?? 0) + (deudas ?? 0) + (answers.branchAOtros ?? 0)
      const otros =
        answers.branchAOtros ?? (total ? Math.max(total - providedSum, 0) : null)
      return {
        resumenVivienda: vivienda,
        resumenAlimentacion: alimentacion,
        resumenServiciosTransporte: servicios,
        resumenDeudas: deudas,
        resumenOtros: otros,
      }
    }

    if (branch === "B") {
      const ingreso = answers.branchBIngreso ?? 0
      const total = answers.branchBGastoTotal ?? Math.round(ingreso * 0.9)
      const deudas = answers.branchBDeudas ?? 0
      const vivienda = Math.round(total * 0.35)
      const alimentacion = Math.round(total * 0.25)
      const servicios = Math.round(total * 0.15)
      const otros = Math.max(total - (vivienda + alimentacion + servicios + deudas), 0)
      return {
        resumenVivienda: vivienda,
        resumenAlimentacion: alimentacion,
        resumenServiciosTransporte: servicios,
        resumenDeudas: deudas,
        resumenOtros: otros,
      }
    }

    if (branch === "C") {
      const vivienda = answers.branchCVivienda ?? 0
      const alimentacion = answers.branchCComida ?? 0
      const servicios = answers.branchCTransporte ?? 0
      const estilo = answers.branchCEstilo ?? 0
      const deudas = 0
      const total = vivienda + alimentacion + servicios + estilo + deudas
      const otros = Math.max(total - (vivienda + alimentacion + servicios + deudas), 0)
      return {
        resumenVivienda: vivienda,
        resumenAlimentacion: alimentacion,
        resumenServiciosTransporte: servicios,
        resumenDeudas: deudas,
        resumenOtros: otros,
      }
    }

    return {}
  }, [answers, branch])

  useEffect(() => {
    if (currentStepId !== "summary" || summaryEdited || !branch) return

    setAnswers((prev) => {
      const next = { ...prev, ...derivedSummary }
      const changed = Object.keys(derivedSummary).some((key) => {
        return prev[key] !== derivedSummary[key]
      })
      return changed ? next : prev
    })

    setSummaryEdited(true)
  }, [branch, currentStepId, derivedSummary, summaryEdited])

  const canProceed = useMemo(() => {
    if (currentStepId === "branch") return branch !== null
    if (currentStepId === "A1") return (answers.branchAIngreso ?? 0) > 0
    if (currentStepId === "A2") return (answers.branchAGastoTotal ?? 0) > 0
    if (currentStepId === "A3") return true
    if (currentStepId === "B1") return answers.branchBIngreso !== null
    if (currentStepId === "B2") return answers.branchBGastoTotal !== null
    if (currentStepId === "B3") return answers.branchBDeudas !== null
    if (currentStepId === "C1") return (answers.branchCIngreso ?? 0) > 0 
    if (currentStepId === "C2") return answers.branchCVivienda !== null
    if (currentStepId === "C3") return answers.branchCComida !== null
    if (currentStepId === "C4") return answers.branchCTransporte !== null
    if (currentStepId === "C5") return answers.branchCEstilo !== null
    return true
  }, [answers, branch, currentStepId])

  const summaryTotal =
    (answers.resumenVivienda ?? 0) +
    (answers.resumenAlimentacion ?? 0) +
    (answers.resumenServiciosTransporte ?? 0) +
    (answers.resumenDeudas ?? 0) +
    (answers.resumenOtros ?? 0)

  const handleFinish = async () => {
    if (isSaving) return
    setCompletionMessage("")
    setIsSaving(true)
    try {
      const gastoTotal =
        toSafeNumber(answers.resumenVivienda) +
        toSafeNumber(answers.resumenAlimentacion) +
        toSafeNumber(answers.resumenServiciosTransporte) +
        toSafeNumber(answers.resumenDeudas) +
        toSafeNumber(answers.resumenOtros)

      const baseIngreso =
        branch === "A"
          ? toSafeNumber(answers.branchAIngreso)
          : branch === "B"
          ? toSafeNumber(answers.branchBIngreso)
          : toSafeNumber(answers.branchCIngreso ?? gastoTotal)

      const ingreso = toSafeNumber(
        answers.resumenIngreso != null ? answers.resumenIngreso : baseIngreso
      )

      const payload = {
        ingreso,
        resumenVivienda: toSafeNumber(answers.resumenVivienda),
        resumenAlimentacion: toSafeNumber(answers.resumenAlimentacion),
        resumenServiciosTransporte: toSafeNumber(answers.resumenServiciosTransporte),
        resumenDeudas: toSafeNumber(answers.resumenDeudas),
        resumenOtros: toSafeNumber(answers.resumenOtros),
      }

      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const userId = user?.id ?? null
      if (!userId) {
        setCompletionMessage("Necesitas iniciar sesión para guardar tu onboarding.")
        return
      }

      const result = await completeOnboardingForUser(userId, payload)

      // result debería traer los snapshots que usa Home.
      // Si todavía no lo hace, en el paso 3 te digo cómo ajustarlo.
      try {
        if (typeof window !== "undefined") {
          const {
            generalSnapshot,
            especificaSnapshot,
            estimablesSnapshot,
          } = (result as any) ?? {}

          if (generalSnapshot) {
            window.localStorage.setItem(LS_GEN, JSON.stringify(generalSnapshot))
          }
          if (especificaSnapshot) {
            window.localStorage.setItem(LS_ESP, JSON.stringify(especificaSnapshot))
          }
          if (estimablesSnapshot) {
            window.localStorage.setItem(
              LS_ESTIMABLES,
              JSON.stringify(estimablesSnapshot)
            )
          }

          // Modo inicial de la Home (podés usar "especifica" si querés otro default)
          window.localStorage.setItem(MODE_KEY, "general")

          // Flag para que Home dispare el tour
          window.localStorage.setItem("miadmi:onboarding-tour", "pending")

          // Avisarle a Home que hay datos nuevos
          window.dispatchEvent(new Event("miadmi:data-updated"))
        }
      } catch {
        // si falla localStorage, que no rompa el onboarding
      }

      setCompletionMessage("¡Listo! Ya armé tu estimación inicial.")
      router.push("/home")



    } catch (err: any) {
      setCompletionMessage(err?.message ?? "No pudimos guardar tu onboarding. Intenta nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderBranchQuestion = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-white">¿Venis bien con los números?</h1>
      <p className="text-white/80">Elegí la opción que mejor te describe.</p>
      <div className="space-y-3">
        {[
          { key: "A", label: "Si, tengo una cifra en mente" },
          { key: "B", label: "Tengo una idea aproximada" },
          { key: "C", label: "No tengo idea" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setBranch(opt.key as Branch)
              setSummaryEdited(false)
            }}
            className={[
              "w-full rounded-2xl border px-4 py-3 text-left text-lg font-semibold transition",
              branch === opt.key
                ? "border-emerald-300 bg-emerald-500/20 text-white"
                : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  const renderBranchASteps = () => {
    if (currentStepId === "A1") {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">¿Cuánto ganas por mes en mano?</h2>
          <input
            type="number"
            inputMode="decimal"
            value={answers.branchAIngreso ?? ""}
            onChange={(e) => setNumberAnswer("branchAIngreso", e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-lg text-white placeholder:text-white/60 focus:border-emerald-400 focus:ring-emerald-400/50"
            placeholder="Ej: 45000"
          />
        </div>
      )
    }
    if (currentStepId === "A2") {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">¿Cuánto gastas aproximado por mes?</h2>
          <input
            type="number"
            inputMode="decimal"
            value={answers.branchAGastoTotal ?? ""}
            onChange={(e) => setNumberAnswer("branchAGastoTotal", e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-lg text-white placeholder:text-white/60 focus:border-emerald-400 focus:ring-emerald-400/50"
            placeholder="Ej: 38000"
          />
        </div>
      )
    }
    if (currentStepId === "A3") {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Gastos por categoría</h2>
            <p className="text-white/80">Si no sabes dejalo en blanco.</p>
          </div>
          <div className="space-y-3">
            {[
              { key: "branchAVivienda", label: "Vivienda" },
              { key: "branchAAlimentacion", label: "Alimentación" },
              { key: "branchAServicios", label: "Servicios y transporte" },
              { key: "branchADeudas", label: "Deudas" },
              { key: "branchAOtros", label: "Otros" },
            ].map((item) => (
              <div key={item.key} className="space-y-1">
                <label className="text-sm text-white/80">{item.label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={answers[item.key as keyof Answers] ?? ""}
                  onChange={(e) => setNumberAnswer(item.key as keyof Answers, e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/60 focus:border-emerald-400 focus:ring-emerald-400/50"
                  placeholder="Opcional"
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const renderBranchBSteps = () => {
    if (currentStepId === "B1") {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Tu ingreso mensual</h2>
          <p className="text-white/80">Elegí el rango que te represente.</p>
          <div className="space-y-2">
            {ingresoRanges.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => setAnswerValue("branchBIngreso", range.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left text-lg font-semibold transition",
                  answers.branchBIngreso === range.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (currentStepId === "B2") {
      const ingreso = answers.branchBIngreso ?? 0
      const multiplierOptions = [
        { label: "Gasto poco", mult: 0.6 },
        { label: "Gasto lo normal", mult: 0.9 },
        { label: "Gasto mucho", mult: 1.1 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Nivel de gastos</h2>
          <p className="text-white/80">A partir de tu ingreso, estimamos un total.</p>
          <div className="space-y-2">
            {multiplierOptions.map((opt) => {
              const total = Math.round(ingreso * opt.mult)
              const selected = answers.branchBGastoTotal === total
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAnswerValue("branchBGastoTotal", total)}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    selected
                      ? "border-emerald-300 bg-emerald-500/20 text-white"
                      : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="text-lg font-semibold">{opt.label}</div>
                  <div className="text-sm text-white/70">Total estimado: {formatCurrency(total)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    if (currentStepId === "B3") {
      const total = answers.branchBGastoTotal ?? 0
      const options = [
        { label: "Casi no uso", factor: 0 },
        { label: "A veces se me va", factor: 0.1 },
        { label: "Vivo del credito", factor: 0.2 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Comportamiento con tarjetas</h2>
          <div className="space-y-2">
            {options.map((opt) => {
              const deudas = Math.round(total * opt.factor)
              const selected = answers.branchBDeudas === deudas
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAnswerValue("branchBDeudas", deudas)}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    selected
                      ? "border-emerald-300 bg-emerald-500/20 text-white"
                      : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="text-lg font-semibold">{opt.label}</div>
                  <div className="text-sm text-white/70">Deudas estimadas: {formatCurrency(deudas)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  const renderBranchCSteps = () => {
    if (currentStepId === "C1") {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Tu ingreso mensual</h2>
          <p className="text-white/80 text-sm">
            Elegí el rango que más se acerque. No tiene que ser exacto.
          </p>
          <div className="space-y-2">
            {ingresoRangesC.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnswerValue("branchCIngreso", opt.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left text-lg font-semibold transition",
                  answers.branchCIngreso === opt.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (currentStepId === "C2") {
      const options = [
        { label: "Tengo casa propia", value: 0 },
        { label: "Vivo con mi familia", value: 1000 },
        { label: "Comparto alquiler", value: 7000 },
        { label: "Pago alquiler", value: 14000 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Vivienda</h2>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnswerValue("branchCVivienda", opt.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  answers.branchCVivienda === opt.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-lg font-semibold">{opt.label}</div>
                <div className="text-sm text-white/70">{formatCurrency(opt.value)} estimado</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (currentStepId === "C3") {
      const options = [
        { label: "Cocino en casa siempre", value: 8000 },
        { label: "Un poco cocino y pido comida a veces", value: 12000 },
        { label: "Pido bastante delivery", value: 16000 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Comida</h2>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnswerValue("branchCComida", opt.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  answers.branchCComida === opt.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-lg font-semibold">{opt.label}</div>
                <div className="text-sm text-white/70">{formatCurrency(opt.value)} estimado</div>
              </button>
            ))}
          </div>
        </div>
      )
    }
     if (currentStepId === "C4") {
      const options = [
        { label: "A pata", value: 0 },
        { label: "Omníbus / Bici", value: 1500 },
        { label: "Moto", value: 2000 },
        { label: "Auto", value: 6000 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Transporte</h2>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnswerValue("branchCTransporte", opt.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  answers.branchCTransporte === opt.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-lg font-semibold">{opt.label}</div>
                <div className="text-sm text-white/70">{formatCurrency(opt.value)} estimado</div>
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (currentStepId === "C5") {
      const options = [
        { label: "Muy tranqui", value: 2000 },
        { label: "A veces me doy algún gusto", value: 4000 },
        { label: "Salgo y compro bastante", value: 8000 },
      ]
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Estilo de vida</h2>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnswerValue("branchCEstilo", opt.value)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  answers.branchCEstilo === opt.value
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/60 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-lg font-semibold">{opt.label}</div>
                <div className="text-sm text-white/70">{formatCurrency(opt.value)} estimado</div>
              </button>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const renderSummary = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Tus gastos estimados por mes</h2>
        <p className="text-white/80">Puedes ajustarlos ahora mismo.</p>
      </div>
      {(() => {
        const gastoTotal =
          toSafeNumber(answers.resumenVivienda) +
          toSafeNumber(answers.resumenAlimentacion) +
          toSafeNumber(answers.resumenServiciosTransporte) +
          toSafeNumber(answers.resumenDeudas) +
          toSafeNumber(answers.resumenOtros)

        const baseIngreso =
          branch === "A"
            ? toSafeNumber(answers.branchAIngreso)
            : branch === "B"
            ? toSafeNumber(answers.branchBIngreso)
            : toSafeNumber(answers.branchCIngreso ?? gastoTotal)

        const ingresoResumen =
          answers.resumenIngreso != null ? answers.resumenIngreso : baseIngreso

        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-white/80">
                Ingreso mensual
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={ingresoResumen ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    resumenIngreso: toSafeNumber(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-emerald-400 focus:ring-emerald-400/50"
              />
            </div>
          </div>
        )
      })()}
      <div className="space-y-3">
        {[
          { key: "resumenVivienda", label: "Vivienda" },
          { key: "resumenAlimentacion", label: "Alimentación" },
          { key: "resumenServiciosTransporte", label: "Servicios y transporte" },
          { key: "resumenDeudas", label: "Deudas" },
          { key: "resumenOtros", label: "Otros" },
        ].map((item) => (
          <div key={item.key} className="space-y-1">
            <label className="text-sm text-white/80">{item.label}</label>
            <input
              type="number"
              inputMode="decimal"
              value={answers[item.key as keyof Answers] ?? ""}
              onChange={(e) => {
                setSummaryEdited(true)
                setNumberAnswer(item.key as keyof Answers, e.target.value)
              }}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/60 focus:border-emerald-400 focus:ring-emerald-400/50"
              placeholder="0"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleFinish}
        disabled={isSaving}
        className="w-full rounded-full bg-emerald-500 px-4 py-3 text-center text-lg font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Guardando..." : "Continuar"}
      </button>
      {completionMessage ? (
        <p className="text-center text-sm text-white/80">{completionMessage}</p>
      ) : null}
    </div>
  )

  const renderContent = () => {
    if (currentStepId === "branch") return renderBranchQuestion()
    if (currentStepId.startsWith("A")) return renderBranchASteps()
    if (currentStepId.startsWith("B")) return renderBranchBSteps()
    if (currentStepId.startsWith("C")) return renderBranchCSteps()
    if (currentStepId === "summary") return renderSummary()
    return null
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0b1e3a] text-white">
      {showLogo ? <LogoReveal exit={logoExit} /> : null}

      {!showLogo ? (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center">
              <Image src="/logo.png" alt="Mi Admi" width={60} height={60} className="mx-auto" />
              <p className="mt-4 text-center text-white/70 text-sm">
                Estos datos nos ayudarán a darte una estimación de a donde va tu plata.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm text-white/70">
              <span className="font-semibold">Paso {step} de {steps.length}</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.max(1, Math.round((step / steps.length) * 100))}%` }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur">
              {renderContent()}
            </div>

            {currentStepId !== "summary" ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className={[
                    "w-full rounded-full border px-4 py-3 text-sm font-semibold transition",
                    step === 1
                      ? "cursor-not-allowed border-white/10 text-white/40"
                      : "border-white/20 text-white hover:border-white/40 hover:bg-white/5",
                  ].join(" ")}
                >
                  Atras
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canProceed}
                  className={[
                    "w-full rounded-full px-4 py-3 text-sm font-semibold transition",
                    canProceed
                      ? "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                      : "cursor-not-allowed bg-white/10 text-white/60",
                  ].join(" ")}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
