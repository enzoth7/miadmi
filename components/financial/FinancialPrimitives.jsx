"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

const easing = [0.22, 1, 0.36, 1];

export function PageSurface({ children, className = "" }) {
  return (
    <div
      className={cn(
        "min-h-full overflow-hidden rounded-3xl border border-slate-200 bg-brand-canvas px-4 py-8 text-brand-navy shadow-2xl shadow-black/10 sm:px-6 lg:px-8 lg:py-10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Reveal({ children, className = "", delay = 0, amount = 0.16 }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.36, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGrid({ children, className = "", as = "div", ...props }) {
  const reduceMotion = useReducedMotion();
  const MotionElement = motion[as] || motion.div;

  return (
    <MotionElement
      className={className}
      {...props}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.14 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {children}
    </MotionElement>
  );
}

export function StaggerItem({ children, className = "", interactive = false }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={
        reduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: easing } },
            }
      }
      whileHover={interactive && !reduceMotion ? { y: -3 } : undefined}
      transition={{ duration: 0.2, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "brand",
  className = "",
  interactive = false,
}) {
  const reduceMotion = useReducedMotion();
  const tones = {
    brand: "bg-blue-50 text-brand-blue",
    positive: "bg-emerald-50 text-emerald-700",
    negative: "bg-rose-50 text-rose-700",
    accent: "bg-brand-yellow text-brand-navy",
  };

  return (
    <motion.article
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        interactive && "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      variants={
        reduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: easing } },
            }
      }
      whileHover={interactive && !reduceMotion ? { y: -3 } : undefined}
      transition={{ duration: 0.2, ease: easing }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {Icon ? (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone] || tones.brand)}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <p className="mt-5 break-words text-2xl font-bold tabular-nums tracking-tight text-brand-navy">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </motion.article>
  );
}

export function ResultPanel({ children, className = "", title = null, eyebrow = null }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className={cn("rounded-2xl bg-brand-navy p-6 text-white shadow-lg ring-1 ring-white/10 sm:p-8", className)}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.38, ease: easing }}
    >
      {eyebrow ? <p className="inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">{eyebrow}</p> : null}
      {title ? <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{title}</h2> : null}
      {children}
    </motion.section>
  );
}
