"use client";

import Link from "next/link";
import Image from "next/image";

export default function BrandLogo({ className = "" }) {
  return (
    <Link href="/" className={["inline-flex items-center", className].join(" ").trim()}>
      <Image
        src="/logo.png"
        alt="Mi Admi"
        width={260}
        height={260}
        className={["w-auto drop-shadow-xl", className || "h-16 sm:h-20"].join(" ").trim()}
        priority
      />
    </Link>
  );
}
