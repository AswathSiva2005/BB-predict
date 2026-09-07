import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard';
import CompanyLogo from '../components/CompanyLogo';
import ExplanationImage from '../components/ExplanationImage';
import MarketCharts from '../components/MarketCharts';
import ProbabilityBars from '../components/ProbabilityBars';
import StatBadge from '../components/StatBadge';
import StatCard from '../components/StatCard';
import { dashboardApi, marketApi, resolveArtifactUrl } from '../services/api';
import { SIGNAL_COLORS, buildProbabilitySeries, formatCurrency, formatPercent } from '../lib/market';

function getContextValue(context = {}, keys = []) {
  for (const key of keys) {
    if (context[key] !== undefined && context[key] !== null) {
      return context[key];
    }
  }
  return null;
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [shapData, setShapData] = useState(null);
  const [limeData, setLimeData] = useState(null);
  const [exploreInsights, setExploreInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [dashboardResponse, stocksResponse] = await Promise.all([
          dashboardApi.dashboard(),
          dashboardApi.stocks(),
        ]);

        if (!active) {
          return;
        }

        const nextDashboard = dashboardResponse.data;
        const nextStocks = stocksResponse.data.stocks ?? [];

        // A saved prediction can reference a symbol that is no longer part of
        // the tracked dataset (e.g. after switching to a different set of
        // companies). Only reuse it as the live selection when it's still valid.
        const validSymbols = new Set(nextStocks.map((stock) => stock.symbol));
        const latestPrediction = validSymbols.has(nextDashboard.latest_prediction?.symbol)
          ? nextDashboard.latest_prediction
          : null;

        const symbol = latestPrediction?.symbol ?? nextStocks[0]?.symbol ?? 'AAPL';
        // Render the inexpensive dashboard data immediately. SHAP and LIME can
        // take considerably longer and must not hold the entire page in its
        // empty state while their plots are generated.
        setDashboard(nextDashboard);
        setStocks(nextStocks);
        setSelectedSymbol(symbol);

        const [predictionResponse, insightsResponse] = await Promise.all([
          latestPrediction ? Promise.resolve({ data: latestPrediction }) : marketApi.prediction({ symbol }),
          dashboardApi.exploreInsights(symbol),
        ]);
        const basePrediction = predictionResponse.data;
        if (!active) {
          return;
        }
        setPrediction(basePrediction);
        setExploreInsights(insightsResponse.data);

        let shapResponse = null;
        let limeResponse = null;
        try {
          shapResponse = await marketApi.shap({ symbol, sample_size: 40, max_display: 10 });
          limeResponse = await marketApi.lime({ symbol, num_features: 10 });
        } catch (explanationError) {
          setError(explanationError?.response?.data?.detail ?? 'Prediction loaded, but explainability generation failed.');
        }

        if (!active) {
          return;
        }
        setShapData(shapResponse?.data ?? null);
        setLimeData(limeResponse?.data ?? null);
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.detail ?? 'Unable to load dashboard data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const currentStock = useMemo(() => stocks.find((item) => item.symbol === selectedSymbol) ?? stocks[0], [stocks, selectedSymbol]);
  const currentPrice = getContextValue(prediction?.context, ['Close', 'close', 'close_price']) ?? currentStock?.latest_close;
  const confidence = prediction?.predicted_probability ?? 0;
  const probabilityBars = buildProbabilitySeries(prediction?.probabilities);

  const rangeMin = currentStock?.min_close ?? 0;
  const rangeMax = currentStock?.max_close ?? 0;
  const rangeSpan = rangeMax - rangeMin || 1;
  const rangeLatestPct = Math.min(100, Math.max(0, ((currentStock?.latest_close ?? rangeMin) - rangeMin) / rangeSpan * 100));
  const rangeAveragePct = Math.min(100, Math.max(0, ((currentStock?.average_close ?? rangeMin) - rangeMin) / rangeSpan * 100));
  const rangeMarkerColor = SIGNAL_COLORS[currentStock?.latest_target?.toUpperCase()] ?? '#2dd4bf';

  const loadSymbol = async (symbol) => {
    setLoading(true);
    setSelectedSymbol(symbol);
    setError('');
    setShapData(null);
    setLimeData(null);
    setExploreInsights(null);
    try {
      const [predictionResponse, insightsResponse] = await Promise.all([
        marketApi.prediction({ symbol }),
        dashboardApi.exploreInsights(symbol),
      ]);
      setPrediction(predictionResponse.data);
      setExploreInsights(insightsResponse.data);

      let shapResponse = null;
      let limeResponse = null;
      try {
        shapResponse = await marketApi.shap({ symbol, sample_size: 40, max_display: 10 });
        limeResponse = await marketApi.lime({ symbol, num_features: 10 });
      } catch (explanationError) {
        setError(explanationError?.response?.data?.detail ?? 'Prediction loaded, but explainability generation failed.');
      }
      setShapData(shapResponse?.data ?? null);
      setLimeData(limeResponse?.data ?? null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to switch stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <CompanyLogo stock={currentStock} size="lg" />
              <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Dashboard</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">{currentStock?.company_name ?? 'Stock market intelligence'}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                {currentStock?.symbol ? `${currentStock.symbol} · ` : ''}Review the latest dataset snapshot, confidence split, saved activity, and SHAP/LIME evidence.
              </p>
              </div>
            </div>

            <select
              value={selectedSymbol}
              disabled={loading}
              onChange={(event) => loadSymbol(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none disabled:cursor-wait disabled:opacity-60 lg:w-56"
            >
              {stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.company_name} ({stock.symbol})
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Current Stock Price" value={formatCurrency(currentPrice)} caption={currentStock?.latest_target ? `Latest target: ${currentStock.latest_target}` : 'No recent target'} tone="from-teal-500/18 to-cyan-500/10" />
            <StatCard label="Prediction" value={prediction?.predicted_label ?? '—'} caption={`Model: ${prediction?.model_name ?? '—'}`} tone="from-slate-500/18 to-slate-500/8" />
            <StatCard label="Confidence" value={formatPercent(confidence)} caption="Predicted class probability" tone="from-emerald-500/18 to-teal-500/10" />
            <StatCard label="Available Symbols" value={String(stocks.length).padStart(2, '0')} caption={`Dashboard rows: ${dashboard?.stock_count ?? stocks.length}`} tone="from-amber-500/18 to-orange-500/10" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatBadge label="Bias" value={prediction?.predicted_label ?? 'HOLD'} tone={prediction?.predicted_label === 'BUY' ? 'emerald' : prediction?.predicted_label === 'SELL' ? 'amber' : 'teal'} />
            <StatBadge label="Model Path" value={prediction?.model_path ? 'Loaded' : 'Unavailable'} tone="slate" />
            <StatBadge label="History" value={dashboard?.total_predictions ? `${dashboard.total_predictions} saved` : 'Empty'} tone="slate" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-panel rounded-[32px] p-7 shadow-2xl shadow-black/25">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Prediction Split</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-white">BUY / HOLD / SELL confidence</h2>
          <div className="mt-6">
            <ProbabilityBars items={probabilityBars} />
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last decision context</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div>Open: <span className="text-white">{formatCurrency(getContextValue(prediction?.context, ['Open', 'open_price']))}</span></div>
              <div>High: <span className="text-white">{formatCurrency(getContextValue(prediction?.context, ['High', 'high_price']))}</span></div>
              <div>Low: <span className="text-white">{formatCurrency(getContextValue(prediction?.context, ['Low', 'low_price']))}</span></div>
              <div>Volume: <span className="text-white">{Number(getContextValue(prediction?.context, ['Volume', 'volume']) ?? 0).toLocaleString()}</span></div>
            </div>
          </div>
        </motion.div>
      </section>

      <MarketCharts symbol={selectedSymbol} />

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="SHAP Visualization" subtitle="Global and local interpretability for the selected stock.">
          <div className="grid gap-4 md:grid-cols-2">
            <ExplanationImage title="Summary Plot" src={resolveArtifactUrl(shapData?.plot_paths?.summary_plot)} description="Top features by mean absolute SHAP value." />
            <ExplanationImage title="Bar Plot" src={resolveArtifactUrl(shapData?.plot_paths?.bar_plot)} description="Feature contributions aggregated across the sample window." />
          </div>
        </ChartCard>

        <ChartCard title="LIME Visualization" subtitle="Local explanation for the current prediction.">
          <div className="grid gap-4 md:grid-cols-2">
            <ExplanationImage title="Contribution Graph" src={resolveArtifactUrl(limeData?.plot_paths?.contribution_graph)} description="Positive and negative local contributions." />
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="font-display text-lg font-semibold text-white">Feature impact</p>
              <div className="mt-4 grid gap-3">
                {(limeData?.positive_features ?? []).slice(0, 4).map((item) => (
                  <div key={item.feature} className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    <span className="font-medium">+ {item.feature}</span>
                    <span className="ml-2 text-emerald-200/80">{Number(item.weight).toFixed(3)}</span>
                  </div>
                ))}
                {(limeData?.negative_features ?? []).slice(0, 4).map((item) => (
                  <div key={item.feature} className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    <span className="font-medium">- {item.feature}</span>
                    <span className="ml-2 text-rose-200/80">{Number(item.weight).toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Market Watchlist" subtitle="Tracked symbols with latest close, move vs. average, and model bias — click a row to load it.">
          <div className="space-y-2.5">
            {stocks.map((stock) => {
              const changePct = stock.average_close
                ? ((stock.latest_close - stock.average_close) / stock.average_close) * 100
                : 0;
              const isNegative = changePct < 0;
              const isActive = stock.symbol === selectedSymbol;
              const badgeColor = SIGNAL_COLORS[stock.latest_target?.toUpperCase()] ?? '#94a3b8';

              return (
                <button
                  type="button"
                  key={stock.symbol}
                  disabled={loading}
                  onClick={() => loadSymbol(stock.symbol)}
                  className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
                    isActive ? 'border-teal-300/50 bg-teal-400/10' : 'border-white/10 bg-slate-950/60 hover:bg-white/5'
                  }`}
                >
                  {stock.logo_url ? (
                    <img
                      src={stock.logo_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1.5"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-white">{stock.symbol}</p>
                    <p className="truncate text-xs text-slate-400">{stock.company_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(stock.latest_close)}</p>
                    <p className={`text-xs font-semibold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isNegative ? '' : '+'}
                      {changePct.toFixed(2)}%
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ borderColor: badgeColor, color: badgeColor }}
                  >
                    {stock.latest_target ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Price Range" subtitle="Where the latest close sits within the stock's full historical range.">
          <div className="space-y-6 text-sm text-slate-300">
            <div>
              <div className="relative mt-9 pb-3">
                <div
                  className="absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow"
                  style={{ left: `${rangeLatestPct}%`, background: rangeMarkerColor }}
                >
                  {formatCurrency(currentStock?.latest_close)}
                </div>
                <div className="h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" />
                <div
                  className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-white/70"
                  style={{ left: `${rangeAveragePct}%` }}
                  title="Historical average"
                />
                <div
                  className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(15,23,42,0.85)]"
                  style={{ left: `${rangeLatestPct}%` }}
                  title="Latest close"
                />
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>{formatCurrency(rangeMin)}</span>
                <span>{formatCurrency(rangeMax)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>All-time low</span>
                <span>All-time high</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Average</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(currentStock?.average_close)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Latest Close</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(currentStock?.latest_close)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Data Points</p>
                <p className="mt-1 font-semibold text-white">{currentStock?.row_count ?? '—'}</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-[32px] p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 font-display text-lg font-bold text-slate-950">
              AI
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">Decision assistant</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                {exploreInsights?.decision_insight?.headline ?? 'Analysing the selected company…'}
              </h2>
            </div>
          </div>

          {exploreInsights?.decision_insight ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    exploreInsights.decision_insight.decision === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : exploreInsights.decision_insight.decision === 'SELL'
                        ? 'bg-rose-500/15 text-rose-200'
                        : 'bg-amber-500/15 text-amber-100'
                  }`}>
                    {exploreInsights.decision_insight.decision}
                  </span>
                  <span className="text-sm text-slate-400">
                    {formatPercent(exploreInsights.decision_insight.confidence)} confidence · {exploreInsights.decision_insight.model_name}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-200">{exploreInsights.decision_insight.summary}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Why this signal?</p>
                <div className="mt-3 space-y-3">
                  {exploreInsights.decision_insight.reasons.map((reason) => (
                    <div key={reason} className="flex gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
                      <span className="text-teal-300">✦</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
                <p className="text-xs text-black font-semibold uppercase tracking-[0.2em] text-amber-200">Risk check</p>
                {exploreInsights.decision_insight.cautions.map((caution) => (
                  <p key={caution} className="mt-2 text-black text-xs leading-5 text-amber-100/70">• {caution}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
              Loading the selected company’s model explanation…
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-panel overflow-hidden rounded-[32px] p-7"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Model results</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-white">Accuracy of all algorithms</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Leakage-controlled chronological holdout results. Weighted F1 determines the deployed model.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Algorithm</th>
                  <th className="pb-3 px-3 font-medium">Accuracy</th>
                  <th className="pb-3 px-3 font-medium">Precision</th>
                  <th className="pb-3 px-3 font-medium">Recall</th>
                  <th className="pb-3 pl-3 font-medium">Weighted F1</th>
                </tr>
              </thead>
              <tbody>
                {(exploreInsights?.model_results ?? []).map((result, index) => (
                  <tr key={result.model} className="border-b border-white/5 text-slate-300 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-xs text-slate-400">{index + 1}</span>
                        <span className="font-medium text-white">{result.model}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">{formatPercent(result.accuracy)}</td>
                    <td className="px-3 py-4">{formatPercent(result.precision)}</td>
                    <td className="px-3 py-4">{formatPercent(result.recall)}</td>
                    <td className="py-4 pl-3">
                      <span className={index === 0 ? 'font-semibold text-emerald-300' : ''}>{formatPercent(result.f1_score)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
