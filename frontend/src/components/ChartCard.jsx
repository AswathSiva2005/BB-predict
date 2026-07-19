import { motion } from 'framer-motion';

export default function ChartCard({ title, subtitle, children, actions }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-panel rounded-2xl p-6 transition duration-300 hover:border-slate-300"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-800">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </motion.section>
  );
}
