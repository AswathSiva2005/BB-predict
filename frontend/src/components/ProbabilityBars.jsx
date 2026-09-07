import { motion } from 'framer-motion';
import { SIGNAL_COLORS } from '../lib/market';

export default function ProbabilityBars({ items = [] }) {
  const maxValue = Math.max(0, ...items.map((item) => Number(item.value || 0)));

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const value = Number(item.value || 0);
        const isTop = maxValue > 0 && value === maxValue;
        const borderColor = SIGNAL_COLORS[item.label?.toUpperCase()] ?? '#2dd4bf';

        return (
          <div
            key={item.label}
            className="space-y-1.5 rounded-2xl px-3 py-2"
            style={{ border: `2px solid ${isTop ? borderColor : 'transparent'}` }}
          >
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{item.label}</span>
              <span>{(value * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, value * 100)}%` }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className={`h-full rounded-full ${item.color ?? 'bg-teal-400'}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
