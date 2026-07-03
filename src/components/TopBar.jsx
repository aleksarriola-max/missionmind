import { useState, useEffect } from 'react';
import { Clock, Wifi, Zap, Sun, Moon } from 'lucide-react';
import { ALARMS, TELEMETRY_CHANNELS } from '../data/telemetry.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useTelemetryStream } from '../hooks/useTelemetryStream.js';

export default function TopBar({ title }) {
  const criticalCount = ALARMS.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount  = ALARMS.filter(a => a.severity === 'warning'  && !a.acknowledged).length;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Stream the battery so the header reads a live, drifting value instead of
  // the frozen import-time last sample.
  const battSeries = useTelemetryStream(TELEMETRY_CHANNELS.battCharge.series, 'topbar-batt');
  const battPct = battSeries[battSeries.length - 1]?.v;
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-[48px] bg-[var(--bg-sidebar)] border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0">
      <div className="flex-1 text-[14px] font-semibold text-[var(--text-primary)] tracking-[0.5px]">{title}</div>

      {criticalCount > 0 && (
        <div className="alarm-pulse flex items-center gap-[5px] bg-[#4c0519] border border-[#f43f5e44] rounded-[4px] px-[10px] py-[3px] text-[12px] text-[#f43f5e]">
          ⚠ {criticalCount} CRITICAL
        </div>
      )}
      {warningCount > 0 && (
        <div className="flex items-center gap-[5px] bg-[#451a03] border border-[#fbbf2444] rounded-[4px] px-[10px] py-[3px] text-[12px] text-[#fbbf24]">
          ⏳ {warningCount} WARNING
        </div>
      )}

      <div className="flex items-center gap-[5px] text-[12px] text-[#34d399]">
        <Wifi size={13} /> DSN NOMINAL
      </div>
      <div className="flex items-center gap-[5px] text-[12px] text-[#94a3b8]">
        <Zap size={13} color="#fbbf24" /> BAT {battPct?.toFixed(1)}%
      </div>
      <div className="flex items-center gap-[5px] text-[12px] text-[var(--text-muted)] font-mono">
        <Clock size={12} /> {now.toUTCString().slice(17, 25)} UTC
      </div>
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex items-center justify-center w-[28px] h-[28px] rounded-[5px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
