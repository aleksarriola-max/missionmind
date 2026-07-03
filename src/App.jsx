import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Brain, GitCompare, Calendar, BookOpen, Satellite, Activity, FlaskConical, RotateCcw, Radio, BarChart3, MapPin, Users } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AlarmFeedSimulator from './components/AlarmFeedSimulator.jsx';
import NotFound from './pages/NotFound.jsx';

// Each view is code-split into its own chunk (loaded on navigation) so the
// initial paint doesn't ship all 13 pages + the Recharts bundle up front.
// Recharts is imported by several of these, so Vite hoists it into one shared
// async chunk the chart pages reuse; the chart-free pages never pull it.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AnomalyInvestigation = lazy(() => import('./pages/AnomalyInvestigation.jsx'));
const AutonomyExplainer = lazy(() => import('./pages/AutonomyExplainer.jsx'));
const PlanVsActual = lazy(() => import('./pages/PlanVsActual.jsx'));
const MissionPlanner = lazy(() => import('./pages/MissionPlanner.jsx'));
const KnowledgeBrain = lazy(() => import('./pages/KnowledgeBrain.jsx'));
const TelemetryAnalytics = lazy(() => import('./pages/TelemetryAnalytics.jsx'));
const BayesianDiagnosis = lazy(() => import('./pages/BayesianDiagnosis.jsx'));
const MissionReplay = lazy(() => import('./pages/MissionReplay.jsx'));
const EarthIndependentOps = lazy(() => import('./pages/EarthIndependentOps.jsx'));
const BenchmarkMode = lazy(() => import('./pages/BenchmarkMode.jsx'));
const RoverOps = lazy(() => import('./pages/RoverOps.jsx'));
const MultiAgentCoordination = lazy(() => import('./pages/MultiAgentCoordination.jsx'));

const NAV_GROUPS = [
  {
    label: 'CORE OPS',
    items: [
      { to: '/',          icon: LayoutDashboard, label: 'Mission Dashboard' },
      { to: '/anomaly',   icon: AlertTriangle,   label: 'Anomaly Investigation',    alarm: true },
      { to: '/autonomy',  icon: Brain,           label: 'Autonomy Explainer' },
      { to: '/plan',      icon: GitCompare,      label: 'Plan vs Actual' },
      { to: '/planner',   icon: Calendar,        label: 'Mission Planner' },
      { to: '/knowledge', icon: BookOpen,        label: 'Knowledge Brain' },
    ],
  },
  {
    label: 'DEEP ANALYSIS',
    items: [
      { to: '/analytics',  icon: Activity,      label: 'Telemetry Analytics' },
      { to: '/bayes',      icon: FlaskConical,  label: 'Bayesian Diagnosis' },
      { to: '/replay',     icon: RotateCcw,     label: 'Mission Replay' },
      { to: '/earthind',   icon: Radio,         label: 'Earth-Independent Ops' },
      { to: '/benchmark',  icon: BarChart3,     label: 'Benchmark Mode' },
    ],
  },
  {
    label: 'SURFACE OPS',
    items: [
      { to: '/rover',      icon: MapPin,        label: 'Rover Surface Ops' },
      { to: '/multiagent', icon: Users,         label: 'Multi-Agent Coordination' },
    ],
  },
];

function Sidebar() {
  return (
    <aside className="w-[220px] min-w-[220px] bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col h-screen overflow-hidden">
      <div className="px-[18px] py-[14px] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-[10px]">
          <Satellite size={20} color="#22d3ee" />
          <div>
            <div className="font-bold text-[15px] text-[var(--text-primary)] tracking-[1px]">MISSION<span className="text-[#22d3ee]">MIND</span></div>
            <div className="text-[10px] text-[var(--text-muted)] tracking-[2px] mt-[1px]">EXPLAINABLE AI OPS</div>
          </div>
        </div>
      </div>

      <div className="mx-[10px] mt-[10px] mb-1 bg-[var(--bg-panel)] border border-[var(--border)] rounded-[6px] px-3 py-2 shrink-0">
        <div className="text-[10px] text-[var(--text-muted)] tracking-[1px] mb-[3px]">ACTIVE MISSION</div>
        <div className="text-[13px] font-semibold text-[#22d3ee]">ARES-7</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-[1px]">Mars Orbiter · Sol 412</div>
        <div className="flex items-center gap-[5px] mt-[6px]">
          <div className="w-[6px] h-[6px] rounded-full bg-[#fbbf24] alarm-pulse" />
          <span className="text-[10px] text-[#fbbf24]">2 Active Alarms</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pt-[6px] pb-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-[9px] text-[var(--text-muted)] opacity-60 tracking-[2px] pt-[10px] px-[18px] pb-1 font-bold">{group.label}</div>
            {group.items.map(({ to, icon: Icon, label, alarm }) => (
              <NavLink
                key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-[9px] px-[14px] py-[7px] mx-2 my-[1px] rounded-[5px] no-underline text-[12px] font-medium transition-all duration-[120ms] border-l-2 ${
                    isActive ? 'bg-[var(--bg-active)] text-[#22d3ee] border-l-[#22d3ee]' : 'text-[var(--text-secondary)] border-l-transparent'
                  }`
                }
              >
                <Icon size={14} />
                <span className="flex-1">{label}</span>
                {alarm && <div className="w-[6px] h-[6px] rounded-full bg-[#f43f5e] alarm-pulse" />}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-[14px] py-[10px] border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] shrink-0">
        <div>Delay: <span className="text-[var(--text-muted)]">14m 32s</span> · DSN: <span className="text-[#34d399]">●</span></div>
        <div className="mt-[3px] opacity-60">Built with IBM Bob · MissionMind v1.0</div>
      </div>
    </aside>
  );
}

function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-2 text-[12px] text-[#22d3ee] tracking-[1px]">
        <div className="w-[10px] h-[10px] rounded-full bg-[#22d3ee] alarm-pulse" />
        LOADING VIEW…
      </div>
    </div>
  );
}

function RoutedMain() {
  // Re-key the boundary on navigation so a fault on one view is cleared when
  // the operator moves to another, without needing a manual retry.
  const location = useLocation();
  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<ViewLoader />}>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/anomaly"   element={<AnomalyInvestigation />} />
            <Route path="/autonomy"  element={<AutonomyExplainer />} />
            <Route path="/plan"      element={<PlanVsActual />} />
            <Route path="/planner"   element={<MissionPlanner />} />
            <Route path="/knowledge" element={<KnowledgeBrain />} />
            <Route path="/analytics" element={<TelemetryAnalytics />} />
            <Route path="/bayes"     element={<BayesianDiagnosis />} />
            <Route path="/replay"    element={<MissionReplay />} />
            <Route path="/earthind"  element={<EarthIndependentOps />} />
            <Route path="/benchmark" element={<BenchmarkMode />} />
            <Route path="/rover"      element={<RoverOps />} />
            <Route path="/multiagent" element={<MultiAgentCoordination />} />
            <Route path="*"           element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          {/* Desktop-first ops console. Below ~1100px the shell keeps its
              layout and scrolls horizontally instead of clipping/overlapping,
              so narrow windows degrade gracefully rather than breaking. */}
          <div className="h-screen w-screen overflow-x-auto overflow-y-hidden bg-[var(--bg-app)]">
            <div className="flex h-full min-w-[1100px]">
              <Sidebar />
              <RoutedMain />
            </div>
          </div>
          <ToastContainer />
          <AlarmFeedSimulator />
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
