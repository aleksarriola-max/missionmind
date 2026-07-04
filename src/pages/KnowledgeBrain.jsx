import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import { KNOWLEDGE_DOCS, NOTEBOOK_ENTRIES } from '../data/knowledge.js';
import { clickable } from '../utils/a11y.js';
import { generate, getLastSource } from '../services/granite.js';
import AiSourceBadge from '../components/AiSourceBadge.jsx';

const CAT_COLOR = {
  'Subsystem Manual': '#22d3ee',
  'Procedures': '#f97316',
  'Operations Plan': '#34d399',
  'Anomaly Report': '#f43f5e',
  'System Document': '#a78bfa',
};

const NOTE_TYPE_COLOR = {
  observation: '#22d3ee', hypothesis: '#fbbf24', decision: '#34d399', concern: '#f43f5e',
};

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  return mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
}

export default function KnowledgeBrain() {
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('observation');
  const [notes, setNotes] = useState(NOTEBOOK_ENTRIES);
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSource, setAiSource] = useState('simulated');

  const filtered = query.length > 1
    ? KNOWLEDGE_DOCS.filter(d =>
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        d.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        d.summary.toLowerCase().includes(query.toLowerCase())
      )
    : KNOWLEDGE_DOCS;

  const SPACE_OPS_SYSTEM_PROMPT =
    'You are the MissionMind knowledge assistant for the ARES-7 Mars Orbiter (Sol 412). ' +
    'Answer operator questions about spacecraft telemetry, anomalies, autonomy, and procedures ' +
    'concisely and factually, citing the relevant document or section when possible. ' +
    'If unsure, say so rather than inventing specifics.';

  // Topic keyword sets are intentionally overlapping (e.g. "safe mode" appears
  // under both battery and autonomy) — matchTopic scores every topic by
  // keyword hits and returns the strongest match, rather than stopping at
  // the first substring hit like a simple if/else chain would.
  const AI_KB_TOPICS = [
    {
      id: 'solar', keywords: ['solar', 'pwr_sol', 'panel', 'shadow', 'shadowing', 'array'],
      response: 'Per ARES-7 Power Subsystem Handbook §4.3: If PWR_SOL_I drops more than 15% for more than 5 minutes, initiate SA-DIAG-01. Check orientation telemetry vs sun vector. If shadowing confirmed, wait for clearance before declaring fault. [Source: DOC-001, §4.3]',
    },
    {
      id: 'battery', keywords: ['battery', 'batt', 'charge', 'discharge', 'pwr_bat'],
      response: 'Battery minimum operational threshold is 60%. Below 65%, autonomy triggers power safe mode. Below 55%, all non-essential loads are shed. Current battery is at 68.4% — autonomy safe mode is correctly active. [Source: DOC-001, §5.1]',
    },
    {
      id: 'spectrometer', keywords: ['spectrometer', 'spec', 'atm_spec', 'observation', 'dust storm', 'science'],
      response: 'ATM_SPEC_412 is HIGH PRIORITY per Mission Science Plan. The plan states: "Do not defer without ART approval." Current deferral by autonomy was triggered by power constraints. Science PI concerns are on record. [Source: DOC-003]',
    },
    {
      id: 'sa-diag', keywords: ['diag', 'sa-diag', 'string', 'sweep'],
      response: 'SA-DIAG-01 is the standard solar array diagnostic sequence. Steps: (1) Check orientation vs sun vector. (2) Sweep each string circuit. (3) Compare V-I curve to known signatures. (4) Report to power engineering team. [Source: DOC-001, §4.3]',
    },
    {
      id: 'autonomy', keywords: ['autonomy', 'safe mode', 'safe-mode', 'fdir', 'decision', 'priority score'],
      response: 'Per ARES-7 Autonomy Architecture §3.2: Power safe mode triggers when battery charge falls below 75% with a negative trend sustained over 10 minutes. It reduces non-critical power loads by 35% and defers science activities, exiting once battery recovers above 80%. Science activities with priority score < 6.0 are automatically deferred in this mode (§4.1). [Source: DOC-005, §3.2–§4.1]',
    },
    {
      id: 'thermal', keywords: ['thruster', 'temp', 'temperature', 'thermal', 'heater'],
      response: 'Per Anomaly Response Procedures THM-ANOM-001: Monitor THM_THR_T trend rate. If rising more than 5°C/hr, reduce thruster operations. If it crosses 65°C, halt thruster use immediately and notify the propulsion team. Current trend is +2.5°C/hr — within nominal bounds but worth watching. [Source: DOC-002, THM-ANOM-001]',
    },
    {
      id: 'comms', keywords: ['comm', 'downlink', 'data rate', 'signal', 'dsn', 'bandwidth'],
      response: 'Downlink rate was reduced from 320 kbps to 220 kbps following autonomy decision AUT-002, in response to the comms power cut after Power Safe Mode entry. This trades science data volume for spacecraft safety per onboard prioritization rules — DSN contact is maintained throughout. [Source: Autonomy Decision Log AUT-002]',
    },
    {
      id: 'mppt', keywords: ['mppt', 'controller', 'bus voltage'],
      response: 'MPPT Controller Fault is the lowest-ranked root-cause hypothesis (28% confidence) for the current anomaly. Bus voltage has remained stable after the current drop, whereas an MPPT tracking failure typically produces voltage instability — this weighs against the hypothesis. Recommended check: monitor bus voltage variance over the next 15 minutes; consider an MPPT reset only if variance increases. [Source: ARES-7 EPS Interface Control Document §7.1.2]',
    },
  ];

  const AI_KB_DEFAULT = 'Based on the knowledge base, the current anomaly (solar current drop + power safe mode) maps to the procedure in DOC-002 PWR-ANOM-003. The highest-priority next step is running SA-DIAG-01 and cross-referencing with historical incident SIM-001 (MRO Sol 88). [Sources: DOC-001, DOC-002, DOC-004]';

  function matchTopic(rawQuery) {
    const q = rawQuery.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const topic of AI_KB_TOPICS) {
      const score = topic.keywords.reduce((s, kw) => s + (q.includes(kw) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = topic; }
    }
    return best ? best.response : AI_KB_DEFAULT;
  }

  function askKB() {
    if (loading) return;
    setLoading(true);
    setAiAnswer('');
    generate(query, {
      system: SPACE_OPS_SYSTEM_PROMPT,
      fallback: () => matchTopic(query),
    }).then((answer) => {
      setAiAnswer(answer);
      setAiSource(getLastSource());
      setLoading(false);
    });
  }

  function addNote() {
    if (!noteText.trim()) return;
    setNotes(prev => [{
      id: `N${prev.length + 1}`, ts: Date.now(), author: 'Operator',
      type: noteType, text: noteText,
    }, ...prev]);
    setNoteText('');
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Knowledge Brain + Operator Notebook — ARES-7" />

      <div className="flex-1 overflow-hidden grid grid-cols-2 grid-rows-2 gap-2 p-2">

        <Panel title="Space Ops Knowledge Brain" className="row-span-2">
          <div className="flex gap-2 mb-[10px]">
            <input
              name="kb-search"
              aria-label="Search knowledge base"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askKB()}
              placeholder="Search docs or ask a question... e.g. 'solar array procedure'"
              className="flex-1 bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] px-3 py-2 text-[12px] text-[#e2e8f0] outline-none"
            />
            <button onClick={askKB} disabled={loading} className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-[14px] py-2 text-[12px] text-[#22d3ee] cursor-pointer">
              Ask AI
            </button>
          </div>

          {loading && <div className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px] text-[12px] text-[#22d3ee] mb-[10px]">⏳ Searching knowledge base…</div>}
          {aiAnswer && !loading && (
            <div className="bg-[#071220] border border-[#22d3ee33] rounded-[5px] p-3 text-[12px] text-[#94a3b8] leading-[1.6] mb-[10px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-[#22d3ee] tracking-[1px]">AI KNOWLEDGE RESPONSE</span>
                <AiSourceBadge source={aiSource} />
              </div>
              <p>{aiAnswer}</p>
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            {filtered.map(doc => (
              <div
                key={doc.id}
                {...clickable(() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id))}
                className={`rounded-[5px] p-[10px] cursor-pointer transition-all duration-150 border ${selectedDoc === doc.id ? `bg-[#0d1525] border-[${CAT_COLOR[doc.category]}55]` : 'bg-[#0a1020] border-[#1e2d55]'}`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[9px] rounded-[3px] px-[6px] py-[1px] shrink-0 mt-[1px] border text-[${CAT_COLOR[doc.category]}] bg-[${CAT_COLOR[doc.category]}22] border-[${CAT_COLOR[doc.category]}44]`}>{doc.category.toUpperCase()}</span>
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">{doc.title}</span>
                </div>
                <div className="text-[11px] text-[#64748b] leading-[1.4]">{doc.summary.slice(0, 100)}…</div>
                <div className="flex gap-1 mt-[6px] flex-wrap">
                  {doc.tags.map(t => <span key={t} className="text-[9px] text-[#475569] bg-[#0f1a30] border border-[#1e2d55] rounded-[2px] px-[5px]">{t}</span>)}
                </div>

                {selectedDoc === doc.id && (
                  <div className="mt-[10px] border-t border-[#1e2d55] pt-[10px]">
                    {doc.excerpts.map((ex, i) => (
                      <div key={i} className="mb-2">
                        <div className={`text-[10px] tracking-[0.5px] mb-[3px] text-[${CAT_COLOR[doc.category]}]`}>{ex.section}</div>
                        <div className="text-[11px] text-[#94a3b8] bg-[#0f1a30] rounded-[4px] px-[10px] py-2 leading-[1.6]">"{ex.text}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Operator Investigation Notebook">
          <div className="mb-[10px]">
            <div className="flex gap-[6px] mb-[6px]">
              {['observation','hypothesis','decision','concern'].map(t => (
                <button key={t} onClick={() => setNoteType(t)}
                  className={`flex-1 p-1 rounded-[4px] cursor-pointer text-[10px] font-semibold border ${noteType === t ? `text-[${NOTE_TYPE_COLOR[t]}] bg-[${NOTE_TYPE_COLOR[t]}33] border-[${NOTE_TYPE_COLOR[t]}66]` : 'text-[#475569] bg-[#0a1020] border-[#1e2d55]'}`}
                >{t.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex gap-[6px]">
              <input
                name="notebook-entry"
                aria-label={`Add ${noteType} note`}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder={`Add ${noteType}...`}
                className="flex-1 bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] px-[10px] py-[7px] text-[12px] text-[#e2e8f0] outline-none"
              />
              <button onClick={addNote} className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-3 py-[7px] text-[12px] text-[#22d3ee] cursor-pointer">+</button>
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            {notes.map(note => (
              <div key={note.id} className={`bg-[#0a1020] rounded-[5px] p-[10px] border border-l-[3px] border-[${NOTE_TYPE_COLOR[note.type]}33] border-l-[${NOTE_TYPE_COLOR[note.type]}]`}>
                <div className="flex justify-between mb-1">
                  <div className="flex gap-[6px] items-center">
                    <span className={`text-[10px] font-bold tracking-[0.5px] text-[${NOTE_TYPE_COLOR[note.type]}]`}>{note.type.toUpperCase()}</span>
                    <span className="text-[10px] text-[#475569]">{note.author}</span>
                  </div>
                  <span className="text-[10px] text-[#475569] font-mono">{timeAgo(note.ts)}</span>
                </div>
                <div className="text-[12px] text-[#94a3b8] leading-[1.5]">{note.text}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Post-Incident Learning Memory">
          <div className="text-[12px] text-[#475569] mb-[10px]">Lessons stored from past anomalies — feeding future AI explanations.</div>
          {[
            { id: 'LES-001', anomaly: 'ANO-2024-201-002 (Sol 201 Shadow)', signals: ['PWR_SOL_I', 'ATT_QUAT'], hypothesis: 'Mars limb shadow', resolution: 'Wait for orbit phase change' },
            { id: 'LES-002', anomaly: 'ANO-2023-088-001 (MRO Sol 88)',    signals: ['PWR_SOL_I', 'PWR_BAT_PCT'], hypothesis: 'Micrometeorite debris', resolution: 'Power budget replan' },
          ].map(l => (
            <div key={l.id} className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px] mb-[6px]">
              <div className="text-[11px] font-semibold text-[#e2e8f0] mb-1">{l.id}: {l.anomaly}</div>
              <div className="text-[11px] text-[#64748b]">Key signals: <span className="text-[#22d3ee]">{l.signals.join(', ')}</span></div>
              <div className="text-[11px] text-[#64748b]">Correct hypothesis: <span className="text-[#34d399]">{l.hypothesis}</span></div>
              <div className="text-[11px] text-[#64748b]">Resolution: <span className="text-[#94a3b8]">{l.resolution}</span></div>
            </div>
          ))}
          <button className="w-full mt-1 bg-[#0f1a30] border border-dashed border-[#1e2d55] rounded-[5px] py-2 text-[12px] text-[#475569] cursor-pointer">
            + Store lesson from current anomaly ANO-2024-412-001
          </button>
        </Panel>

      </div>
    </div>
  );
}
