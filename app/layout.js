import "./globals.css";
import Header from "../components/Header";
import Sidebar from "../components/sidebar";
import { SessionProvider } from "../components/SessionProvider";
import BottomNav from "../components/BottomNav";

export const metadata = {
  title: "Mi Admi",
  description: "MVP finanzas personales para Uruguay",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0b1e3a] text-white antialiased">
        <SessionProvider>
          <Sidebar />
          <div className="flex min-h-screen flex-col lg:pl-60">
            <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1e3a]/90 backdrop-blur">
              <div className="px-4 py-4 lg:px-8">
                <Header />
              </div>
            </div>
            <main className="flex-1 px-4 py-6 lg:px-8">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
          </div>
          <div className="lg:hidden">
            <BottomNav />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
