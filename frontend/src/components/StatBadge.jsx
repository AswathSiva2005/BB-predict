export default function StatBadge({ label, value, tone = 'slate' }) {
  const palette = {
    slate: 'border-white/10 bg-white/5 text-slate-200',
    teal: 'border-teal-500/20 bg-teal-500/10 text-teal-100',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${palette[tone]}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}