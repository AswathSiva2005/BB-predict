import { describe, expect, it } from 'vitest';
import { buildMarketSeries, formatCurrency, formatPercent } from './market';

describe('market helpers', () => {
  it('formats financial values consistently', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.50');
    expect(formatPercent(0.875)).toBe('87.5%');
  });

  it('builds deterministic chart data for a symbol', () => {
    const first = buildMarketSeries({ symbol: 'RELIANCE', close: 100 });
    const second = buildMarketSeries({ symbol: 'RELIANCE', close: 100 });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(10);
  });
});
