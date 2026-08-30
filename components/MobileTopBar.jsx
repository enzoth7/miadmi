"use client";

import BrandLogo from "./BrandLogo";

export default function MobileTopBar() {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 shadow-sm md:hidden">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center">
        <BrandLogo className="h-14" />
      </div>
    </div>
  );
}
