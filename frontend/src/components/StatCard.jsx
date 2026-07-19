import { motion } from 'framer-motion';

export default function StatCard({ label, value, caption, tone = 'from-teal-500/20 to-cyan-500/10' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none"
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <h3 className="mt-3 font-display text-2xl font-bold text-slate-800">{value}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p>
    </motion.div>
  );
}
