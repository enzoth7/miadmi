// /components/ui/KpiChip.js
"use client";

import { ArrowUpRight, ArrowDownRight, Circle } from "lucide-react";

export default function KpiChip({
  label,
  value,
  hint,
  trend = "flat", // 'up' | 'down' | 'flat'
}) {
  const Icon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Circle;

  return (
    <div className="bg-white/70 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm border border-white/80">
      <Icon className="h-4 w-4" />
      <div className="leading-tight">
        <div className="text-xs text-gray-600">{label}</div>
        <div className="font-semibold text-sm">{value}</div>
        {hint ? <div className="text-[11px] text-gray-500">{hint}</div> : null}
      </div>
    </div>
  );
}
