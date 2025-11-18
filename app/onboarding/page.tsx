"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '../../lib/supabaseBrowser'

const LS_GEN = 'miadmi:estimacion_general'

function n(v: any): number {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [sueldos, setSueldos] = useState('')
  const [otrosIngresos, setOtrosIngresos] = useState('')
  const [egreso1, setEgreso1] = useState('') // Alquiler
  const [egreso2, setEgreso2] = useState('') // Servicios
  const [egreso3, setEgreso3] = useState('') // Transporte
  const [egreso4, setEgreso4] = useState('') // Comida
  const [ahorroDeseado, setAhorroDeseado] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const egresos = [
        { nombre: 'Alquiler', monto: n(egreso1) },
        { nombre: 'Servicios', monto: n(egreso2) },
        { nombre: 'Transporte', monto: n(egreso3) },
        { nombre: 'Comida', monto: n(egreso4) },
      ].filter((e) => e.monto > 0)

      const localPayload = {
        sueldos: n(sueldos),
        otrosIngresos: n(otrosIngresos),
        ahorroDeseado: n(ahorroDeseado),
        saldoInicial: n(saldoInicial),
        egresos,
      }

      try {
        localStorage.setItem(LS_GEN, JSON.stringify(localPayload))
      } catch {}

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: existing } = await supabase
          .from('estimacion_general')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        const dbPayload = {
          sueldos: n(sueldos),
          otros_ingresos: n(otrosIngresos),
          ahorro_deseado: n(ahorroDeseado),
          saldo_inicial: n(saldoInicial),
          egresos,
        }

        if (existing?.id) {
          await supabase.from('estimacion_general').update(dbPayload).eq('id', existing.id)
        } else {
          await supabase.from('estimacion_general').insert({ user_id: user.id, ...dbPayload })
        }
      }

      router.replace('/home')
    } catch (err: any) {
      setError(err?.message ?? 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Comencemos</h1>
        <p className="text-sm text-gray-600 mt-1">Cargá datos básicos para tu estimación general.</p>

        {error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sueldos</label>
            <input
              type="number"
              inputMode="decimal"
              value={sueldos}
              onChange={(e) => setSueldos(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Otros ingresos</label>
            <input
              type="number"
              inputMode="decimal"
              value={otrosIngresos}
              onChange={(e) => setOtrosIngresos(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Egreso: Alquiler</label>
            <input
              type="number"
              inputMode="decimal"
              value={egreso1}
              onChange={(e) => setEgreso1(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Egreso: Servicios</label>
            <input
              type="number"
              inputMode="decimal"
              value={egreso2}
              onChange={(e) => setEgreso2(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Egreso: Transporte</label>
            <input
              type="number"
              inputMode="decimal"
              value={egreso3}
              onChange={(e) => setEgreso3(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Egreso: Comida</label>
            <input
              type="number"
              inputMode="decimal"
              value={egreso4}
              onChange={(e) => setEgreso4(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ahorro deseado</label>
            <input
              type="number"
              inputMode="decimal"
              value={ahorroDeseado}
              onChange={(e) => setAhorroDeseado(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Saldo inicial</label>
            <input
              type="number"
              inputMode="decimal"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar y continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
