import { motion } from 'framer-motion';

export default function StatCard({ label, value, caption, tone = 'from-teal-500/20 to-cyan-500/10' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${tone} p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]`}
    >
      <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{label}</p>
      <h3 className="mt-3 font-display text-3xl font-semibold text-white">{value}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{caption}</p>
    </motion.div>
  );
}
