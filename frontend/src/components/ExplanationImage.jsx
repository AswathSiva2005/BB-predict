export default function ExplanationImage({ title, src, description }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-lg font-semibold text-white">{title}</h4>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
        {src ? <img src={src} alt={title} className="h-auto w-full object-contain" /> : <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">No visual generated yet.</div>}
      </div>
    </div>
  );
}