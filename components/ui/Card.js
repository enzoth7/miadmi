// /components/ui/Card.js
"use client";

export default function Card({ className = "", children }) {
  return (
    <div
      className={[
        "bg-sky-50 text-gray-900 rounded-2xl shadow-md",
        "border border-white/70",
        // sutil “alma”: levanta al pasar, pero sin animación intrusiva
        "transition-transform duration-300 will-change-transform",
        "hover:-translate-y-[2px]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
