import { useToast } from '../context/ToastContext.jsx';
import { clickable } from '../utils/a11y.js';

const SEVERITY_STYLE = {
  critical: { bg: '#4c0519', border: '#f43f5e66', color: '#f43f5e' },
  warning:  { bg: '#451a03', border: '#fbbf2466', color: '#fbbf24' },
  info:     { bg: '#0c1a2e', border: '#22d3ee66', color: '#22d3ee' },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[320px]">
      {toasts.map(t => {
        const s = SEVERITY_STYLE[t.severity] || SEVERITY_STYLE.info;
        return (
          <div
            key={t.id}
            {...clickable(() => dismissToast(t.id))}
            aria-label={`Dismiss alarm: ${t.title}`}
            className={`toast-in bg-[${s.bg}] border border-[${s.border}] rounded-[6px] px-3 py-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.45)] cursor-pointer`}
          >
            <div className="flex justify-between items-center mb-[3px]">
              <span className={`text-[10px] font-bold text-[${s.color}] tracking-[0.5px]`}>{t.severity.toUpperCase()} · NEW ALARM</span>
              <span className="text-[11px] text-[#475569]">✕</span>
            </div>
            <div className="text-[12px] font-semibold text-[#e2e8f0] mb-[2px]">{t.title}</div>
            {t.detail && <div className="text-[11px] text-[#94a3b8] leading-[1.4]">{t.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}
