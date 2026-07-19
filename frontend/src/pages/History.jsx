import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatPercent } from '../lib/market';

export default function History() {
  const [history, setHistory] = useState({ predictions: [], trainings: [] });
  const [query, setQuery] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await dashboardApi.history();
        if (active) setHistory(response.data);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.detail ?? 'Unable to load account activity.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const availableSymbols = useMemo(() => {
    const symbols = new Set();
    history.predictions.forEach((item) => symbols.add(item.symbol));
    return Array.from(symbols).sort();
  }, [history.predictions]);

  const filteredPredictions = useMemo(() => {
    const search = query.trim().toLowerCase();

    return history.predictions.filter((item) => {
      const matchesSymbol = symbolFilter === 'all' || item.symbol === symbolFilter;
      const matchesQuery =
        !search ||
        [item.symbol, item.model_name, item.predicted_label, item.explanation_type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));

      return matchesSymbol && matchesQuery;
    });
  }, [history.predictions, query, symbolFilter]);

  const filteredTrainings = useMemo(() => {
    const search = query.trim().toLowerCase();

    return history.trainings.filter((item) => {
      const matchesQuery =
        !search ||
        [item.model_name, item.status, item.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));

      return matchesQuery;
    });
  }, [history.trainings, query]);

  const exportHistory = () => {
    const rows = [
      ['record_type', 'symbol', 'label', 'score', 'model_name', 'status', 'created_at', 'notes'],
      ...filteredPredictions.map((item) => [
        'prediction',
        item.symbol,
        item.predicted_label,
        item.predicted_probability,
        item.model_name,
        '',
        item.created_at,
        item.explanation_type ?? '',
      ]),
      ...filteredTrainings.map((item) => [
        'training',
        (item.symbols ?? []).join('|'),
        item.model_name ?? '',
        item.row_count ?? '',
        item.best_model_path ?? '',
        item.status ?? '',
        item.started_at,
        item.notes ?? '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const cell = value === null || value === undefined ? '' : String(value);
            return `"${cell.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'xai-stock-history.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">History</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">Prediction and training timeline.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Review saved predictions, stored explainability payloads, and completed training jobs.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.5fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search history"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
          />
          <select
            value={symbolFilter}
            onChange={(event) => setSymbolFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-teal-400"
          >
            <option value="all">All symbols</option>
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
          <button type="button" onClick={exportHistory} className="rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95">
            Export history
          </button>
        </div>
      </motion.div>

      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="glass-panel rounded-3xl p-6 text-sm text-slate-300">Loading your saved activity…</div> : null}

      {!loading ? <ChartCard title="Prediction history" subtitle="Most recent saved predictions with confidence values.">
        <div className="space-y-3">
          {filteredPredictions.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-white">{item.symbol}</p>
                  <p className="mt-1 text-sm text-slate-400">Model: {item.model_name}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                  <span>{item.predicted_label}</span>
                  <span>{formatPercent(item.predicted_probability)}</span>
                  <span>{formatCurrency(item.input_context?.Close)}</span>
                </div>
              </div>
            </div>
          ))}
          {!filteredPredictions.length ? <p className="text-sm text-slate-400">No prediction history matches the current filters.</p> : null}
        </div>
      </ChartCard> : null}

      {!loading ? <ChartCard title="Training history" subtitle="Completed training runs and best-model checkpoints.">
        <div className="space-y-3">
          {filteredTrainings.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-white">{item.model_name ?? 'Training job'}</p>
                  <p className="mt-1 text-sm text-slate-400">Status: {item.status}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                  <span>Rows: {item.row_count ?? '-'}</span>
                  <span>Started: {item.started_at?.slice(0, 19).replace('T', ' ')}</span>
                  <span>Finished: {item.finished_at?.slice(0, 19).replace('T', ' ') ?? '-'}</span>
                </div>
              </div>
            </div>
          ))}
          {!filteredTrainings.length ? <p className="text-sm text-slate-400">No training history matches the current filters.</p> : null}
        </div>
      </ChartCard> : null}
    </div>
  );
}
