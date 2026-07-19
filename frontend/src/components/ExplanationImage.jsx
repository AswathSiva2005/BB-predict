export default function ExplanationImage({ title, src, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-bold text-slate-800">{title}</h4>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {src ? <img src={src} alt={title} className="h-auto w-full object-contain" /> : <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">No visual generated yet.</div>}
      </div>
    </div>
  );
}
