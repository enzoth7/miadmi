"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import {
  ensureGuestSpace,
  reconcileUserSpace,
  restoreSpace,
  saveActiveSpace,
  syncChangedUserData,
} from "../lib/hybrid-storage";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const syncTimer = useRef(null);
  const currentUserId = useRef(null);
  const supabase = useMemo(() => createClient(), []);

  const enterGuest = useCallback(() => {
    if (currentUserId.current) saveActiveSpace(`user:${currentUserId.current}`);
    ensureGuestSpace();
    restoreSpace("guest");
    currentUserId.current = null;
    setUser(null);
    setStatus("guest");
  }, []);

  const enterUser = useCallback(async (nextUser) => {
    if (!currentUserId.current) {
      ensureGuestSpace();
      saveActiveSpace("guest");
    }
    await reconcileUserSpace(supabase, nextUser.id);
    currentUserId.current = nextUser.id;
    setUser(nextUser);
    setStatus("authenticated");
  }, [supabase]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      try {
        if (data.user) await enterUser(data.user);
        else enterGuest();
      } catch {
        if (active) enterGuest();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === "INITIAL_SESSION") return;
      window.setTimeout(async () => {
        if (session?.user) await enterUser(session.user);
        else enterGuest();
      }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [enterGuest, enterUser, supabase]);

  useEffect(() => {
    const sync = () => {
      if (!currentUserId.current || !navigator.onLine) return;
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        syncChangedUserData(supabase, currentUserId.current).catch(() => {});
      }, 350);
    };
    const onVisibility = () => document.visibilityState === "visible" && sync();
    window.addEventListener("miadmi:data-updated", sync);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("miadmi:data-updated", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (currentUserId.current) saveActiveSpace(`user:${currentUserId.current}`);
    await supabase.auth.signOut();
    enterGuest();
  }, [enterGuest, supabase]);

  const value = useMemo(() => ({ status, user, signOut, supabase }), [signOut, status, supabase, user]);
  return (
    <SessionContext.Provider value={value}>
      {status === "loading" ? (
        <div className="flex min-h-dvh items-center justify-center bg-[#0b1e3a] text-sm text-white/70" role="status">
          Cargando Mi Admi…
        </div>
      ) : children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession debe usarse dentro de SessionProvider");
  return value;
}
