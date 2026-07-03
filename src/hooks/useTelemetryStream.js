import { useState, useEffect } from 'react';

// Appends a new simulated data point every `intervalMs` and trims to the
// original window size, so live telemetry charts actually animate instead
// of rendering a static array generated once at import time. Continues the
// short-term drift/noise of the trailing points rather than the channel's
// full generation parameters, since only the series itself is available
// here at render time.
export function useTelemetryStream(initialSeries, key, { intervalMs = 3000, enabled = true } = {}) {
  const [series, setSeries] = useState(initialSeries);

  // Reset the stream when the channel key changes. Using React's
  // "adjust state during render" pattern (track prevKey in state and reset
  // inline) instead of an effect avoids the cascading-render that a
  // synchronous setState inside useEffect would cause.
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setSeries(initialSeries);
  }

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setSeries(prev => {
        const last = prev[prev.length - 1];
        const recent = prev.slice(-10).map(p => p.v);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const std = Math.sqrt(recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length) || 0.05;
        const drift = prev.length > 1 ? (last.v - prev[prev.length - 2].v) * 0.3 : 0;
        const nextV = +(last.v + drift + (Math.random() - 0.5) * std).toFixed(2);
        const next = { t: Date.now(), v: nextV };
        return [...prev.slice(1), next];
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [key, intervalMs, enabled]);

  return series;
}
