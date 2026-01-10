"use client"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex min-h-screen w-full items-center justify-center bg-[#0b1e3a]">
      {children}
    </div>
  )
}
