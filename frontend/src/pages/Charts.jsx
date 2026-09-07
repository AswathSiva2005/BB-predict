import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import MarketCharts from '../components/MarketCharts';
import { dashboardApi } from '../services/api';

export default function Charts() {
  const [stocks, setStocks] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await dashboardApi.stocks();
        if (!active) return;
        const nextStocks = response.data.stocks ?? [];
        setStocks(nextStocks);
        setSymbol(nextStocks[0]?.symbol ?? 'AAPL');
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.detail ?? 'Unable to load the market list.');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Charts</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold text-white">Technical chart room.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Inspect the latest saved candle context, volume, RSI behaviour, and MACD momentum for any tracked symbol.</p>
          </div>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none lg:w-52">
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>{stock.company_name} ({stock.symbol})</option>
            ))}
          </select>
        </div>
      </motion.div>

      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <MarketCharts symbol={symbol} />
    </div>
  );
}
