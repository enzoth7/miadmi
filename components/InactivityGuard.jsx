"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabaseBrowser";
import { useSessionInfo } from "./SessionProvider";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const BASE_LAST_ACTIVITY_STORAGE_KEY = "miadmi:lastActivity";
const LEGACY_LAST_ACTIVITY_STORAGE_KEY = "miadmi:last-activity";
const TIMEOUT_MESSAGE = "Tu sesion expiro por inactividad. Volve a iniciar sesion.";

function buildStorageKeys(userId) {
  const scopedKey = userId
    ? `${BASE_LAST_ACTIVITY_STORAGE_KEY}:${userId}`
    : BASE_LAST_ACTIVITY_STORAGE_KEY;
  const fallbackKeys = [BASE_LAST_ACTIVITY_STORAGE_KEY, LEGACY_LAST_ACTIVITY_STORAGE_KEY].filter(
    (key) => key !== scopedKey
  );
  return {
    scopedKey,
    allKeys: [scopedKey, ...fallbackKeys],
    legacyKeys: fallbackKeys,
  };
}

function persistLastActivity(timestamp, userId) {
  if (typeof window === "undefined") return;
  try {
    const { scopedKey, legacyKeys } = buildStorageKeys(userId);
    window.localStorage.setItem(scopedKey, String(timestamp));
    legacyKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

function readLastActivity(userId) {
  if (typeof window === "undefined") return null;
  const { scopedKey, allKeys } = buildStorageKeys(userId);
  for (const key of allKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        if (key !== scopedKey) {
          persistLastActivity(parsed, userId);
        }
        return parsed;
      }
    } catch {
      // ignore malformed values
    }
  }
  return null;
}

function clearLastActivity(userId) {
  if (typeof window === "undefined") return;
  try {
    const { allKeys } = buildStorageKeys(userId);
    allKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

function shouldTriggerTimeout(timestamp) {
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp >= INACTIVITY_LIMIT_MS;
}

export default function InactivityGuard({ currentPath = "/" }) {
  const router = useRouter();
  const { user, refresh } = useSessionInfo();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const userId = user?.id ?? null;
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const hasLoggedOutRef = useRef(false);

  const redirectTarget =
    typeof currentPath === "string" && currentPath.startsWith("/") ? currentPath : "/";

  const cleanupInterval = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const notifyTimeout = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.alert(TIMEOUT_MESSAGE);
    } catch {
      // ignore if alerts are blocked
    }
  }, []);

  const recordActivity = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    lastActivityRef.current = now;
    persistLastActivity(now, userId);
  }, [user, userId]);

  const executeTimeoutLogout = useCallback(async () => {
    if (!user || hasLoggedOutRef.current) return;
    hasLoggedOutRef.current = true;
    cleanupInterval();

    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        hasLoggedOutRef.current = false;
        return;
      }
    } catch (error) {
      console.warn("No se pudo verificar la sesion antes del logout automatico", error);
    }

    try {
      await supabase.auth.signOut();
      await fetch("/api/signout", { method: "POST" });
      await refresh();
    } catch (error) {
      console.error("Fallo el cierre de sesion por inactividad", error);
    } finally {
      clearLastActivity(userId);
      notifyTimeout();
      const params = new URLSearchParams({ mode: "login", reason: "timeout" });
      params.set("redirectTo", redirectTarget);
      router.replace(`/login?${params.toString()}`);
    }
  }, [cleanupInterval, notifyTimeout, redirectTarget, refresh, router, supabase, user, userId]);

  const checkForTimeout = useCallback(() => {
    if (!user || hasLoggedOutRef.current) return;
    const stored = readLastActivity(userId);
    if (Number.isFinite(stored)) {
      lastActivityRef.current = stored;
    }
    const lastActivity = Number.isFinite(lastActivityRef.current)
      ? lastActivityRef.current
      : Date.now();
    if (shouldTriggerTimeout(lastActivity)) {
      executeTimeoutLogout();
    }
  }, [executeTimeoutLogout, user, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!user) {
      cleanupInterval();
      hasLoggedOutRef.current = false;
      clearLastActivity(userId);
      return undefined;
    }

    hasLoggedOutRef.current = false;
    const stored = readLastActivity(userId);
    if (Number.isFinite(stored) && !shouldTriggerTimeout(stored)) {
      lastActivityRef.current = stored;
    } else {
      recordActivity();
    }

    const handleUserActivity = () => recordActivity();
    const handleStorage = (event) => {
      if (!event) return;
      const { allKeys } = buildStorageKeys(userId);
      if (event.key && !allKeys.includes(event.key)) return;
      const nextValue = event.newValue ? Number(event.newValue) : null;
      if (Number.isFinite(nextValue)) {
        lastActivityRef.current = nextValue;
      } else {
        const latest = readLastActivity(userId);
        if (Number.isFinite(latest)) {
          lastActivityRef.current = latest;
        }
      }
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleUserActivity, { passive: true })
    );
    window.addEventListener("storage", handleStorage);

    cleanupInterval();
    intervalRef.current = window.setInterval(checkForTimeout, CHECK_INTERVAL_MS);
    checkForTimeout();

    return () => {
      cleanupInterval();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleUserActivity)
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [checkForTimeout, cleanupInterval, executeTimeoutLogout, recordActivity, user, userId]);

  return null;
}
