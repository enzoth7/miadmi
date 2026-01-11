'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useEffect, useRef } from 'react';


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

export default function EstimaTuMesClient() {
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
  stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, [step]);

const saldoColor =
  saldoEstimado > 5000
    ? 'text-emerald-300'
    : saldoEstimado >= 0
    ? 'text-amber-300'
    : 'text-rose-400';
  

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
            <label htmlFor='income' className='text-sm font-medium text-white'>
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
              className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/30'
            />
            {errors.income ? (
              <p id='income-error' role='alert' className='text-xs text-rose-200'>
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
              <legend className='text-sm font-medium text-white'>
                {'¿Pagas alquiler?'}
              </legend>
              <div className='grid gap-3 sm:grid-cols-2'>
                <label className='flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30'>
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
                    className='h-4 w-4 accent-emerald-400'
                  />
                  <span className='text-sm text-white'>No</span>
                </label>
                <label className='flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30'>
                  <input
                    type='radio'
                    name='housing'
                    value='si'
                    checked={housingChoice === 'si'}
                    onChange={() => {
                      setHousingChoice('si');
                      setErrors({});
                    }}
                    className='h-4 w-4 accent-emerald-400'
                  />
                  <span className='text-sm text-white'>{'S\u00ed'}</span>
                </label>
              </div>
              {errors.housingChoice ? (
                <p id='housing-choice-error' role='alert' className='text-xs text-rose-200'>
                  {errors.housingChoice}
                </p>
              ) : null}
            </fieldset>

            {housingChoice === 'si' ? (
              <div className='space-y-3'>
                <label htmlFor='housingAmount' className='text-sm font-medium text-white'>
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
                  className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/30'
                />
                {errors.housingAmount ? (
                  <p id='housing-amount-error' role='alert' className='text-xs text-rose-200'>
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
            <legend className='text-sm font-medium text-white'>
              {'¿Cuanto se te van en servicios? (OSE, UTE, ANTEL)'}
            </legend>
            <div className='space-y-3'>
              {SERVICE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className='flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30'
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
                    className='mt-1 h-4 w-4 accent-emerald-400'
                  />
                  <span className='text-sm text-white'>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.services ? (
              <p id='services-error' role='alert' className='text-xs text-rose-200'>
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
            <legend className='text-sm font-medium text-white'>
              {'¿Cómo te manejas con la comida?'}
            </legend>
            <div className='space-y-3'>
              {FOOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className='flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30'
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
                    className='mt-1 h-4 w-4 accent-emerald-400'
                  />
                  <span className='text-sm text-white'>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.food ? (
              <p id='food-error' role='alert' className='text-xs text-rose-200'>
                {errors.food}
              </p>
            ) : null}
          </fieldset>
        );
      case 5:
        return (
          <fieldset className='space-y-3'>
            <legend className='text-sm font-medium text-white'>
              Extras / Gastos recurrentes
            </legend>
            <div className='space-y-3'>
              {EXTRAS_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className='flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30'
                >
                  <input
                    type='checkbox'
                    name={`extra-${option.id}`}
                    checked={extras.includes(option.id)}
                    onChange={() => {
                      toggleExtra(option.id);
                      setErrors({});
                    }}
                    className='mt-1 h-4 w-4 accent-emerald-400'
                  />
                  <span className='text-sm text-white'>{option.label}</span>
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
    <main className='mx-auto max-w-2xl space-y-6 px-4 py-10 sm:py-14'>
      <header className='space-y-3'>
        <h1 className='text-3xl font-semibold text-white'>
          {'Estim\u00e1 tu mes en 30 segundos'}
        </h1>
        <p className='text-sm text-white/80'>
          {'Respondé estas preguntas y conocé como podrias llegar a terminar tu mes.'}
        </p>
      </header>

 <section className='rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6'>
  <form onSubmit={handleNext} className='space-y-6'>
    <div className='flex items-center justify-between text-xs text-white/60'>
    </div>

    {/* pasos acumulados */}
    <div ref={stepRef} className='space-y-10'>
      {Array.from({ length: Math.min(step, TOTAL_STEPS) }, (_, i) => (
        <div key={i}>{renderStepByIndex(i + 1)}</div>
      ))}
    </div>

    {/* botones solo mientras haya pasos */}
    {step <= TOTAL_STEPS && (
      <div className='flex flex-wrap gap-3'>
        {step > 1 && (
          <button
            type='button'
            onClick={handleBack}
            className='rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40'
          >
            {'Atr\u00e1s'}
          </button>
        )}
        <button
          type='submit'
          className='rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300'
        >
          {step === TOTAL_STEPS ? 'Ver resultado' : 'Siguiente'}
        </button>
      </div>
    )}
  </form>
    
            {/* RESULTADO FINAL AL FONDO */}
  {step > TOTAL_STEPS && (
    <div className='mt-12 space-y-6'>
            <div className='space-y-2'>
              <h2 className='text-lg font-semibold text-white'>
                {'Con esta estimación, este mes te quedaría a fin de mes'}
              </h2>
 <p className={`text-4xl font-semibold ${saldoColor}`}>
  {formatUYU(saldoEstimado)}
</p>


              <p className='text-sm text-white/80'>{saldoMensaje}</p>
            </div>

   <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>

  <div className='space-y-1 text-sm text-white/70'>
    <p>
      Ingresos:{' '}
      <span className='font-medium text-white'>
        {formatUYU(incomeValue)}
      </span>
    </p>
    <p>
      Gastos estimados:{' '}
      <span className='font-medium text-white'>
        {formatUYU(totalGastosEstimados)}
      </span>
    </p>
    <p>
      Saldo final estimado:{' '}
      <span className='font-medium text-white'>
        {formatUYU(saldoEstimado)}
      </span>
    </p>
  </div>
</div>


            <p className='text-xs text-white/50'>
              {'Estimaci\u00f3n orientativa. No es asesoramiento financiero.'}
            </p>

            <button
              type='button'
              onClick={handleReset}
              className='rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40'
            >
              Recalcular
            </button>

            <div className='rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4'>
              <p className='text-sm text-white/80'>
                {'Si quer\u00e9s llevar tu mes con m\u00e1s claridad y seguimiento, probá Mi Admi.'}
              </p>
              <a
  href='/login'
  className='mt-3 block w-full rounded-full bg-emerald-400 px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-emerald-300'
>
  Empezar gratis
</a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
