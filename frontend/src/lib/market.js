const palette = ['#14b8a6', '#22c55e', '#f59e0b', '#38bdf8', '#f97316'];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createRandom(seedValue) {
  let seed = seedValue % 2147483647;
  if (seed <= 0) {
    seed += 2147483646;
  }
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function buildProbabilitySeries(probabilities = []) {
  return ['BUY', 'HOLD', 'SELL'].map((label, index) => ({
    label,
    value: Number(probabilities?.[index] ?? 0),
    color: palette[index],
  }));
}

export function buildMarketSeries({ close = 100, volume = 1000000, rsi = 52, macd = 0, symbol = 'DEMO' } = {}) {
  const rand = createRandom(hashString(symbol || 'DEMO'));
  const baseClose = Number(close) || 100;
  const baseVolume = Number(volume) || 1000000;
  const series = [];
  let currentClose = baseClose;

  for (let index = 24; index >= 1; index -= 1) {
    const drift = (rand() - 0.46) * 0.035;
    const open = currentClose * (1 + drift * 0.4);
    const closeValue = open * (1 + drift);
    const high = Math.max(open, closeValue) * (1 + rand() * 0.018);
    const low = Math.min(open, closeValue) * (1 - rand() * 0.018);
    const candleVolume = baseVolume * (0.72 + rand() * 0.65);
    const rsiValue = Math.min(92, Math.max(8, rsi + (rand() - 0.5) * 16));
    const macdValue = macd + (rand() - 0.5) * 1.2;
    const signal = macdValue * 0.76 + (rand() - 0.5) * 0.18;

    series.push({
      name: `T-${index}`,
      open,
      close: closeValue,
      high,
      low,
      volume: candleVolume,
      rsi: rsiValue,
      macd: macdValue,
      signal,
      histogram: macdValue - signal,
    });

    currentClose = closeValue;
  }

  return series;
}

export function selectChartWindow(series, limit = 12) {
  return series.slice(Math.max(series.length - limit, 0));
}

export function getTrendTone(label) {
  if (!label) {
    return 'neutral';
  }

  if (label.toUpperCase() === 'BUY') {
    return 'bullish';
  }

  if (label.toUpperCase() === 'SELL') {
    return 'bearish';
  }

  return 'neutral';
}

export function splitExplanations(items = []) {
  return items.reduce(
    (accumulator, item) => {
      if (item.weight >= 0) {
        accumulator.positive.push(item);
      } else {
        accumulator.negative.push(item);
      }
      return accumulator;
    },
    { positive: [], negative: [] },
  );
}

export function resolveChartSeriesFromPrediction(prediction = {}) {
  const context = prediction.context ?? {};
  return buildMarketSeries({
    close: context.Close ?? context.close_price ?? prediction.predicted_probability * 100,
    volume: context.Volume ?? 1000000,
    rsi: context.RSI ?? 52,
    macd: context.MACD ?? 0,
    symbol: prediction.symbol,
  });
}