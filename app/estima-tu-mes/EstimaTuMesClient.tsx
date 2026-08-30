'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { PageSurface, ResultPanel } from '../../components/financial/FinancialPrimitives';


const TOTAL_STEPS = 5;

const SERVICE_OPTIONS = [
  { value: 3000, label: 'Poco ($3.000)' },
  { value: 5000, label: 'Bastante ($5.000)' },
  { value: 8000, label: 'Mucho ($8.000)' },
];

const FOOD_OPTIONS = [
  { value: 9000, label: 'Cocino casi siempre ($9.000)' },
  { value: 14000, label: 'Me doy algunos gustos ($14.000)' },
  { value: 20000, label: 'Pido delivery/como afuera seguido ($20.000)' },
];

const EXTRAS_OPTIONS = [
  { id: 'transporte', label: 'Transporte ($3.000)', value: 3000 },
  { id: 'saludas', label: 'Salidas ($3.000)', value: 3000 },
  { id: 'gym', label: 'Gym ($2.000)', value: 2000 },
  { id: 'tarjetas', label: 'Tarjetas / Préstamos ($5.000)', value: 5000 },
  { id: 'otros', label: 'Otros ($2.000)', value: 2000 },
];

const getLabelByValue = (options: { value: number; label: string }[], value: string) => {
  const found = options.find((o) => String(o.value) === value);
  return found?.label ?? '';
};

const getExtrasLabels = (selected: string[]) =>
  EXTRAS_OPTIONS.filter((o) => selected.includes(o.id)).map((o) => o.label);


const formatUYU = (value: number) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(value);

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inputClassName =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-blue-100';

const optionClassName =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/60 has-[:checked]:border-brand-blue has-[:checked]:bg-blue-50';

export default function EstimaTuMesClient() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState('');
  const [housingChoice, setHousingChoice] = useState('');
  const [housingAmount, setHousingAmount] = useState('');
  const [services, setServices] = useState('');
  const [food, setFood] = useState('');
  const [extras, setExtras] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const incomeValue = toNumber(income);
  const housingValue = housingChoice === 'si' ? toNumber(housingAmount) : 0;
  const servicesValue = toNumber(services);
  const foodValue = toNumber(food);
  const extrasTotal = EXTRAS_OPTIONS.reduce(
    (sum, extra) => sum + (extras.includes(extra.id) ? extra.value : 0),
    0
  );

  const totalGastosEstimados = housingValue + servicesValue + foodValue + extrasTotal;
  const saldoEstimado = incomeValue - totalGastosEstimados;

const stepRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  stepRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}, [reduceMotion, step]);

const saldoColor =
  saldoEstimado > 5000
    ? 'text-emerald-300'
    : saldoEstimado >= 0
    ? 'text-blue-200'
    : 'text-rose-300';
  

const saldoMensaje =
  saldoEstimado > 5000
    ? 'Venís bien este mes. Mantener el control te ayuda a seguir así.'
    : saldoEstimado >= 0
    ? 'Estás justo este mes. Tener claridad día a día puede marcar la diferencia.'
    : 'Este mes puede estar complicado. Llevar un seguimiento simple puede ayudarte a ordenar mejor tus gastos.';

  const validateStep = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!(incomeValue > 0)) {
        nextErrors.income = 'Ingres\u00e1 un monto v\u00e1lido mayor a 0.';
      }
    }

    if (currentStep === 2) {
      if (!housingChoice) {
        nextErrors.housingChoice = 'Seleccion\u00e1 una opci\u00f3n.';
      }
      if (housingChoice === 'si' && !(housingValue > 0)) {
        nextErrors.housingAmount = 'Ingres\u00e1 el monto mensual.';
      }
    }

    if (currentStep === 3) {
      if (!services) {
        nextErrors.services = 'Eleg\u00ed un rango sugerido.';
      }
    }

    if (currentStep === 4) {
      if (!food) {
        nextErrors.food = 'Eleg\u00ed una opci\u00f3n.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = (event?: FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }
    if (!validateStep(step)) return;
    setErrors({});
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS + 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleReset = () => {
    setStep(1);
    setIncome('');
    setHousingChoice('');
    setHousingAmount('');
    setServices('');
    setFood('');
    setExtras([]);
    setErrors({});
  };

  const toggleExtra = (id: string) => {
    setExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

const renderStepByIndex = (currentStep: number) => {
  switch (currentStep) {
      case 1:
        return (
          <div className='space-y-3'>
            <label htmlFor='income' className='text-sm font-bold text-gray-700'>
              Sueldo mensual en mano
            </label>
            <input
              id='income'
              name='income'
              type='number'
              inputMode='numeric'
              min={1}
              placeholder='Ej: 45000'
              value={income}
              onChange={(event) => {
                setIncome(event.target.value);
                setErrors({});
              }}
              aria-invalid={Boolean(errors.income)}
              aria-describedby={errors.income ? 'income-error' : undefined}
              className={inputClassName}
            />
            {errors.income ? (
              <p id='income-error' role='alert' className='text-xs font-medium text-red-600'>
                {errors.income}
              </p>
            ) : null}
          </div>
        );
      case 2:
        return (
          <div className='space-y-4'>
            <fieldset
              className='space-y-3'
              aria-describedby={errors.housingChoice ? 'housing-choice-error' : undefined}
            >
              <legend className='text-sm font-bold text-gray-700'>
                {'¿Pagás alquiler?'}
              </legend>
              <div className='grid gap-3 sm:grid-cols-2'>
                <label className={optionClassName}>
                  <input
                    type='radio'
                    name='housing'
                    value='no'
                    checked={housingChoice === 'no'}
                    onChange={() => {
                      setHousingChoice('no');
                      setHousingAmount('');
                      setErrors({});
                    }}
                    className='mt-0.5 h-4 w-4 accent-[#0b1e3a]'
                  />
                  <span className='text-sm text-[#0b1e3a]'>No</span>
                </label>
                <label className={optionClassName}>
                  <input
                    type='radio'
                    name='housing'
                    value='si'
                    checked={housingChoice === 'si'}
                    onChange={() => {
                      setHousingChoice('si');
                      setErrors({});
                    }}
                    className='mt-0.5 h-4 w-4 accent-[#0b1e3a]'
                  />
                  <span className='text-sm text-[#0b1e3a]'>{'S\u00ed'}</span>
                </label>
              </div>
              {errors.housingChoice ? (
                <p id='housing-choice-error' role='alert' className='text-xs font-medium text-red-600'>
                  {errors.housingChoice}
                </p>
              ) : null}
            </fieldset>

            {housingChoice === 'si' ? (
              <div className='space-y-3'>
                <label htmlFor='housingAmount' className='text-sm font-bold text-gray-700'>
                  Monto mensual (UYU)
                </label>
                <input
                  id='housingAmount'
                  name='housingAmount'
                  type='number'
                  inputMode='numeric'
                  min={1}
                  placeholder='Ej: 18000'
                  value={housingAmount}
                  onChange={(event) => {
                    setHousingAmount(event.target.value);
                    setErrors({});
                  }}
                  aria-invalid={Boolean(errors.housingAmount)}
                  aria-describedby={errors.housingAmount ? 'housing-amount-error' : undefined}
                  className={inputClassName}
                />
                {errors.housingAmount ? (
                  <p id='housing-amount-error' role='alert' className='text-xs font-medium text-red-600'>
                    {errors.housingAmount}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      case 3:
        return (
          <fieldset
            className='space-y-3'
            aria-describedby={errors.services ? 'services-error' : undefined}
          >
            <legend className='text-sm font-bold text-gray-700'>
              {'¿Cuánto se te va en servicios? (OSE, UTE, ANTEL)'}
            </legend>
            <div className='space-y-3'>
              {SERVICE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={optionClassName}
                >
                  <input
                    type='radio'
                    name='services'
                    value={option.value}
                    checked={services === String(option.value)}
                    onChange={(event) => {
                      setServices(event.target.value);
                      setErrors({});
                    }}
                    className='mt-1 h-4 w-4 accent-[#0b1e3a]'
                  />
                  <span className='text-sm text-[#0b1e3a]'>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.services ? (
              <p id='services-error' role='alert' className='text-xs font-medium text-red-600'>
                {errors.services}
              </p>
            ) : null}
          </fieldset>
        );
      case 4:
        return (
          <fieldset
            className='space-y-3'
            aria-describedby={errors.food ? 'food-error' : undefined}
          >
            <legend className='text-sm font-bold text-gray-700'>
              {'¿Cómo te manejas con la comida?'}
            </legend>
            <div className='space-y-3'>
              {FOOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={optionClassName}
                >
                  <input
                    type='radio'
                    name='food'
                    value={option.value}
                    checked={food === String(option.value)}
                    onChange={(event) => {
                      setFood(event.target.value);
                      setErrors({});
                    }}
                    className='mt-1 h-4 w-4 accent-[#0b1e3a]'
                  />
                  <span className='text-sm text-[#0b1e3a]'>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.food ? (
              <p id='food-error' role='alert' className='text-xs font-medium text-red-600'>
                {errors.food}
              </p>
            ) : null}
          </fieldset>
        );
      case 5:
        return (
          <fieldset className='space-y-3'>
            <legend className='text-sm font-bold text-gray-700'>
              Extras / Gastos recurrentes
            </legend>
            <div className='space-y-3'>
              {EXTRAS_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={optionClassName}
                >
                  <input
                    type='checkbox'
                    name={`extra-${option.id}`}
                    checked={extras.includes(option.id)}
                    onChange={() => {
                      toggleExtra(option.id);
                      setErrors({});
                    }}
                    className='mt-1 h-4 w-4 accent-[#0b1e3a]'
                  />
                  <span className='text-sm text-[#0b1e3a]'>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      default:
        return null;
    }
  };

  return (
    <PageSurface>
    <main className='grid w-full gap-8 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-start'>
      <header className='space-y-3 lg:sticky lg:top-28'>
        <h1 className='text-3xl font-extrabold text-brand-navy sm:text-4xl'>
          {'Estim\u00e1 tu mes en 30 segundos'}
        </h1>
        <p className='max-w-xl text-sm leading-6 text-slate-600 sm:text-base'>
          {'Respondé estas preguntas y conocé cómo podrías llegar a terminar tu mes.'}
        </p>
        <div className='border-l-4 border-brand-yellow pl-4'>
          <h2 className='text-sm font-bold text-brand-navy'>Una estimación rápida</h2>
          <p className='mt-1 text-sm leading-6 text-slate-600'>
            Usamos rangos cotidianos para darte una referencia clara, sin registros ni planillas.
          </p>
        </div>
      </header>

 <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'>
  <form onSubmit={handleNext} className='space-y-6'>
    <div className='space-y-2'>
      <div className='flex items-center justify-between text-xs font-semibold text-gray-600'>
        <span>{step <= TOTAL_STEPS ? `Paso ${step} de ${TOTAL_STEPS}` : 'Estimación completa'}</span>
        <span>{Math.min(step, TOTAL_STEPS) * 20}%</span>
      </div>
      <div className='h-1.5 overflow-hidden rounded-full bg-gray-100'>
        <div
          className='h-full rounded-full bg-brand-yellow transition-[width] duration-300 motion-reduce:transition-none'
          style={{ width: `${Math.min(step, TOTAL_STEPS) * 20}%` }}
        />
      </div>
    </div>

    {/* pasos acumulados */}
    <div ref={stepRef} className='space-y-8'>
      {Array.from({ length: Math.min(step, TOTAL_STEPS) }, (_, i) => (
        <div key={i} className='border-b border-slate-200 pb-8 last:border-b-0 last:pb-0'>{renderStepByIndex(i + 1)}</div>
      ))}
    </div>

    {/* botones solo mientras haya pasos */}
    {step <= TOTAL_STEPS && (
      <div className='flex flex-wrap gap-3'>
        {step > 1 && (
          <button
            type='button'
            onClick={handleBack}
            className='inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'
          >
            {'Atr\u00e1s'}
          </button>
        )}
        <button
          type='submit'
          className='inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-navy transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'
        >
          {step === TOTAL_STEPS ? 'Ver resultado' : 'Siguiente'}
        </button>
      </div>
    )}
  </form>
    
            {/* RESULTADO FINAL AL FONDO */}
  {step > TOTAL_STEPS && (
    <div className='mt-10'>
            <ResultPanel eyebrow='Resultado estimado'>
              <h2 className='mt-5 text-sm font-semibold text-white'>
                {'Con esta estimación, este mes te quedaría a fin de mes'}
              </h2>
 <p className={`mt-2 text-4xl font-extrabold tabular-nums ${saldoColor}`}>
  {formatUYU(saldoEstimado)}
</p>


              <p className='mt-2 text-sm text-slate-300'>{saldoMensaje}</p>

   <div className='mt-6 border-y border-white/15 py-4'>

  <div className='grid gap-3 text-sm text-slate-300 sm:grid-cols-3 sm:divide-x sm:divide-white/15'>
    <p>
      Ingresos:{' '}
      <span className='block font-bold tabular-nums text-white'>
        {formatUYU(incomeValue)}
      </span>
    </p>
    <p>
      Gastos estimados:{' '}
      <span className='block font-bold tabular-nums text-white'>
        {formatUYU(totalGastosEstimados)}
      </span>
    </p>
    <p>
      Saldo final estimado:{' '}
      <span className='block font-bold tabular-nums text-white'>
        {formatUYU(saldoEstimado)}
      </span>
    </p>
  </div>
</div>


            <p className='mt-5 text-xs text-slate-300'>
              {'Estimaci\u00f3n orientativa. No es asesoramiento financiero.'}
            </p>

            <button
              type='button'
              onClick={handleReset}
              className='mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-transparent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy'
            >
              Recalcular
            </button>

            <div className='mt-6 border-t border-white/15 pt-5'>
              <p className='text-sm text-slate-200'>
                {'Si quer\u00e9s llevar tu mes con m\u00e1s claridad y seguimiento, probá Mi Admi.'}
              </p>
              <a
  href='/home'
  className='mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-yellow px-5 py-3 text-center text-sm font-bold text-brand-navy transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy'
>
  Empezar gratis
</a>
            </div>
            </ResultPanel>
          </div>
        )}
      </section>
    </main>
    </PageSurface>
  );
}
