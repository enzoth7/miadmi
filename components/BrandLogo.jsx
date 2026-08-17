"use client";

import Link from "next/link";
import Image from "next/image";

export default function BrandLogo({ className = "" }) {
  return (
    <Link href="/" className={["inline-flex items-center", className].join(" ").trim()}>
      <Image
        src="/Header.png"
        alt="Mi Admi"
        width={260}
        height={260}
        className={["w-auto object-contain", className || "h-9 sm:h-10"].join(" ").trim()}
        priority
      />
    </Link>
  );
}
