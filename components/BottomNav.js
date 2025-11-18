"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const Item = ({ href, label }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex-1 text-center py-2 ${
          active ? "font-semibold text-blue-600" : "text-gray-600"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex">
      <Item href="/perfil" label="Mi perfil" />
    </nav>
  );
}
