import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import AiSourceBadge from '../components/AiSourceBadge.jsx';
import { generate, getLastSource } from '../services/granite.js';
import {
  summarizeMissionState,
  OPERATOR_BRIEF_SYSTEM_PROMPT,
  PUBLIC_DIGEST_SYSTEM_PROMPT,
  buildOperatorBrief,
  buildPublicDigest,
} from '../services/missionBriefing.js';

const MODES = {
  operator: { label: 'Operator Brief', system: OPERATOR_BRIEF_SYSTEM_PROMPT, fallback: buildOperatorBrief },
  public: { label: 'Public Digest', system: PUBLIC_DIGEST_SYSTEM_PROMPT, fallback: buildPublicDigest },
};

export default function MissionBriefing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('operator');
  const [brief, setBrief] = useState('');
  const [source, setSource] = useState('simulated');
  const [loading, setLoading] = useState(false);

  function runBriefing(nextMode) {
    setLoading(true);
    setBrief('');
    const state = summarizeMissionState();
    const cfg = MODES[nextMode];
    generate(JSON.stringify(state), {
      system: cfg.system,
      fallback: () => cfg.fallback(state),
    }).then((text) => {
      setBrief(text);
      setSource(getLastSource());
      setLoading(false);
    });
  }

  // Runs once on mount to render the default (operator) brief immediately.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { runBriefing('operator'); }, []);

  function selectMode(nextMode) {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    runBriefing(nextMode);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mission Briefing — ARES-7" />
      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <Panel title="Adaptive Mission Briefing" className="max-w-[720px] w-full">
          <div className="flex gap-2 mb-4">
            {Object.entries(MODES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className={`flex-1 py-2 rounded-[5px] text-[12px] font-semibold border cursor-pointer ${mode === key ? 'bg-[#162040] border-[#22d3ee44] text-[#22d3ee]' : 'bg-[#0a1020] border-[#1e2d55] text-[#64748b]'}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {loading && <div className="text-[12px] text-[#22d3ee] mb-4">⏳ Generating briefing…</div>}
          {brief && !loading && (
            <div className="bg-[#071220] border border-[#22d3ee33] rounded-[5px] p-4 text-[13px] text-[#94a3b8] leading-[1.7] mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#22d3ee] tracking-[1px]">{MODES[mode].label.toUpperCase()}</span>
                <AiSourceBadge source={source} />
              </div>
              <p>{brief}</p>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#162040] border border-[#22d3ee44] rounded-[5px] py-3 text-[13px] font-semibold text-[#22d3ee] cursor-pointer"
          >
            Enter Mission Control →
          </button>
        </Panel>
      </div>
    </div>
  );
}
