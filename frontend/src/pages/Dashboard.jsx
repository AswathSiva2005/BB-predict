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
import { buildProbabilitySeries, formatCurrency, formatPercent, resolveChartSeriesFromPrediction, selectChartWindow } from '../lib/market';

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
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [dashboardResponse, stocksResponse, historyResponse] = await Promise.all([
          dashboardApi.dashboard(),
          dashboardApi.stocks(),
          dashboardApi.history().catch(() => ({ data: null })),
        ]);

        if (!active) {
          return;
        }

        const nextDashboard = dashboardResponse.data;
        const nextStocks = stocksResponse.data.stocks ?? [];
        const latestPrediction = nextDashboard.latest_prediction;
        const historyPayload = historyResponse.data;

        const symbol = latestPrediction?.symbol ?? nextStocks[0]?.symbol ?? 'RELIANCE';
        // Render the inexpensive dashboard data immediately. SHAP and LIME can
        // take considerably longer and must not hold the entire page in its
        // empty state while their plots are generated.
        setDashboard(nextDashboard);
        setStocks(nextStocks);
        setSelectedSymbol(symbol);
        setHistory(historyPayload ?? { predictions: [], trainings: [] });

        const basePrediction = latestPrediction ?? (await marketApi.prediction({ symbol })).data;
        if (!active) {
          return;
        }
        setPrediction(basePrediction);

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
  const chartData = useMemo(() => selectChartWindow(resolveChartSeriesFromPrediction(prediction ?? { symbol: selectedSymbol })), [prediction, selectedSymbol]);
  const probabilityBars = buildProbabilitySeries(prediction?.probabilities);

  return (
    <div className="space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <CompanyLogo stock={currentStock} size="lg" />
              <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Dashboard</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">{currentStock?.company_name ?? 'Indian stock intelligence'}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                {currentStock?.symbol ? `${currentStock.symbol} · ` : ''}Review the latest dataset snapshot, confidence split, saved activity, and SHAP/LIME evidence.
              </p>
              </div>
            </div>

            <select
              value={selectedSymbol}
              disabled={loading}
              onChange={async (event) => {
                const symbol = event.target.value;
                setLoading(true);
                setSelectedSymbol(symbol);
                setError('');
                setShapData(null);
                setLimeData(null);
                try {
                  const predictionResponse = await marketApi.prediction({ symbol });
                  setPrediction(predictionResponse.data);

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
              }}
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

      <MarketCharts data={chartData} />

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
        <ChartCard title="Prediction History" subtitle="Latest saved actions and training activity.">
          <div className="space-y-4">
            {((history?.predictions?.length ? history.predictions : dashboard?.latest_prediction ? [dashboard.latest_prediction] : [])).slice(0, 5).map((item) => (
              <div key={item.id ?? `${item.symbol}-${item.sample_index}`} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{item.symbol ?? selectedSymbol}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.predicted_label ?? 'Prediction'}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                    {formatPercent(item.predicted_probability ?? confidence)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Explainability Snapshot" subtitle="Saved visual artifacts served from the backend.">
          <div className="space-y-4 text-sm text-slate-300">
            <p>SHAP and LIME figures are automatically generated by the backend and rendered here from the artifact server.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatBadge label="SHAP" value={shapData?.model_name ?? 'Ready'} tone="teal" />
              <StatBadge label="LIME" value={limeData?.model_name ?? 'Ready'} tone="emerald" />
            </div>
            <p className="rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-300">
              Selected row index: <span className="text-white">{prediction?.sample_index ?? 0}</span>
            </p>
          </div>
        </ChartCard>
      </section>
    </div>
  );
}
