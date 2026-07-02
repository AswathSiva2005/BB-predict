export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-slate-950/80 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Built for explainable stock trend research.</p>
        <p>Tailwind CSS, Framer Motion, and FastAPI integration.</p>
      </div>
    </footer>
  );
}