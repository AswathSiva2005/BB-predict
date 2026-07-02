import { motion } from 'framer-motion';

export default function ProbabilityBars({ items = [] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{item.label}</span>
            <span>{(Number(item.value || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, Number(item.value || 0) * 100)}%` }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className={`h-full rounded-full ${item.color ?? 'bg-teal-400'}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}