export default function Panel({ title, badge, children, style = {}, className = '', headerRight }) {
  return (
    <div
      className={`flex flex-col overflow-hidden bg-[var(--bg-panel)] border border-[var(--border)] rounded-[6px] ${className}`}
      style={style}
    >
      <div className="flex items-center gap-2 px-[14px] py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-[1px] uppercase flex-1">{title}</span>
        {badge && badge}
        {headerRight && headerRight}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}
