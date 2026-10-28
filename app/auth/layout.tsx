export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2] px-4 py-8 sm:py-12 font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20] relative overflow-hidden">
      {/* Glow ambiental cálido dorado (idéntico al fondo de la referencia) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-[#EAA228]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </main>
  );
}
