"use client";

import { useEffect, useState } from "react";

export default function InstallPWAButton() {
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [openIOSHelp, setOpenIOSHelp] = useState(false);
  

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true; // iOS viejo
    setIsStandalone(standalone);

    const handler = (e) => {
      // Chrome/Android: guardamos el evento para dispararlo con el botón
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

useEffect(() => {
  const mq = window.matchMedia("(max-width: 767px)");
  const update = () => setIsMobile(mq.matches);
  update();
  mq.addEventListener?.("change", update);
  return () => mq.removeEventListener?.("change", update);
}, []);

if (!isMobile) return null;


  if (isStandalone) return null; // ya está instalada

  const onClick = async () => {
    if (isIOS) {
      setOpenIOSHelp(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  // Mostrar botón si:
  // - Android: cuando canInstall es true
  // - iOS: siempre (porque no hay evento beforeinstallprompt)
  const shouldShow = isIOS || canInstall;

  if (!shouldShow) return null;

  return (
    <>
      <button
        onClick={onClick}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-white px-6 py-4 text-base font-semibold text-slate-900 shadow-lg active:scale-95"
      >
        Instalar
      </button>

      {/* Ayuda iOS */}
      {openIOSHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Instalar en iPhone</p>
                <p className="mt-1 text-sm text-slate-300">
                  1) Tocá <b>Compartir</b> (cuadrado con flecha) <br />
                  2) Elegí <b>“Añadir a pantalla de inicio”</b> (cuadrado con +) <br />
                  3) <b>Agregar</b>
                </p>
              </div>
              <button
                onClick={() => setOpenIOSHelp(false)}
                className="rounded-lg px-3 py-1 text-sm text-slate-300 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
