"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionInfo } from "@/components/SessionProvider";
import SimpleProfileStepper from "./SimpleProfileStepper";
import SimpleSummary from "./SimpleSummary";
import SimpleFlowTree from "./SimpleFlowTree";
import {
  SIMPLE_FLOW_KEY,
  SIMPLE_HELPER_CLOSED_KEY,
  SIMPLE_PROFILE_KEY,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "./simple-storage";
import {
  buildSimpleSummary,
  type SimpleProfileAnswers,
  type SimpleProfileState,
} from "./simple-utils";


type ProfileRow = {
  answers?: Record<string, unknown> | null;
  completed?: boolean | null;
  updated_at?: string | null;
};

type SimpleProfileUpsertRow = {
  user_id: string;
  answers: SimpleProfileAnswers;
  completed: boolean;
  updated_at: string | null;
};

type SimpleFlowUpsertRow = {
  user_id: string;
  state: Record<string, unknown>;
  updated_at: string | null;
};

const EMPTY_PROFILE: SimpleProfileState = {
  answers: {},
  completed: false,
  updatedAt: null,
};

function safeIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function normalizeProfile(raw: unknown): SimpleProfileState {
  const obj = raw && typeof raw === "object" ? (raw as any) : null;

  const updatedAt =
    safeIsoOrNull(obj?.updated_at) ?? safeIsoOrNull(obj?.updatedAt) ?? null;

  const answers =
    obj?.answers && typeof obj.answers === "object" ? obj.answers : {};

  return {
    answers,
    completed: Boolean(obj?.completed),
    updatedAt,
  };
}

export default function HomeSimplePage() {
  const { user } = useSessionInfo();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<SimpleProfileState>(EMPTY_PROFILE);
  const [localReady, setLocalReady] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [helperClosed, setHelperClosed] = useState(false);
  const [flowFinished, setFlowFinished] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Cargar estado local (siempre)
  useEffect(() => {
    const local = readLocalStorage<SimpleProfileState | null>(
      SIMPLE_PROFILE_KEY,
      null
    );
    if (local) setProfile(normalizeProfile(local));

    const helperState = readLocalStorage<boolean>(
      SIMPLE_HELPER_CLOSED_KEY,
      false
    );
    setHelperClosed(Boolean(helperState));

    setLocalReady(true);
  }, []);



  // si el perfil deja de estar completo, resetea flowFinished
  useEffect(() => {
    if (!profile.completed) setFlowFinished(false);
  }, [profile.completed]);

const handleProfileSave = useCallback(
  async ({ answers, completed }: { answers: SimpleProfileAnswers; completed: boolean }) => {
    const next: SimpleProfileState = {
      answers,
      completed,
      updatedAt: new Date().toISOString(),
    };

    setProfile(next);
    writeLocalStorage(SIMPLE_PROFILE_KEY, next);

    return { ok: true };
  },
  []
);


const handleReset = useCallback(async () => {
  if (resetting) return;
  setResetting(true);
  setResetError("");

  setProfile(EMPTY_PROFILE);
  setIsEditingProfile(false);
  setFlowFinished(false);

  removeLocalStorage(SIMPLE_PROFILE_KEY);
  removeLocalStorage(SIMPLE_FLOW_KEY);

  setResetting(false);
}, [resetting]);


  const handleHelperClose = useCallback(() => {
    setHelperClosed(true);
    writeLocalStorage(SIMPLE_HELPER_CLOSED_KEY, true);
  }, []);

  const showStepper = !profile.completed || isEditingProfile;
  const showSummary = profile.completed && !isEditingProfile;
  const showFlowTree = showSummary && !helperClosed && !flowFinished;

  const summary = useMemo(() => buildSimpleSummary(profile.answers), [profile.answers]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-semibold">Modo simple</h1>
        <p className="mt-2 text-lg text-white/80">Un paso a la vez.</p>
        <p className="mt-2 text-sm text-white/70">Vamos de a poco.</p>
        {!userId ? (
          <p className="mt-3 text-xs text-white/60">
            Modo demo: esto se guarda en este dispositivo.
          </p>
        ) : null}
      </header>

      {showStepper ? (
        <SimpleProfileStepper
          answers={profile.answers}
          completed={profile.completed}
          isEditing={isEditingProfile}
          onEditingDone={() => setIsEditingProfile(false)}
          onSave={handleProfileSave}
        />
      ) : null}

      {showSummary ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Editar respuestas
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={handleReset}
              className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rehacer desde cero
            </button>
          </div>

          {resetError ? <p className="text-xs text-amber-200">{resetError}</p> : null}

          <SimpleSummary summary={summary} />

          {showFlowTree ? (
            <SimpleFlowTree
  summary={summary}
  onFinished={setFlowFinished}
  onClose={handleHelperClose}
/>

          ) : null}
        </>
      ) : null}
    </div>
  );
}
