import { Component } from 'react';

// Catches render/runtime errors in any page so a single failing view degrades
// to an inline message instead of white-screening the whole mission console.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In a real deployment this would ship to the ground-segment log service.
    console.error('MissionMind page error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-[520px] bg-[#0a1020] border border-[#f43f5e44] rounded-[8px] p-6 text-center">
            <div className="text-[#f43f5e] text-[13px] font-bold tracking-[1px] mb-2">⚠ VIEW FAULT — ISOLATED</div>
            <div className="text-[#e2e8f0] text-[14px] font-semibold mb-2">This panel hit an unexpected error.</div>
            <div className="text-[#94a3b8] text-[12px] leading-[1.6] mb-4">
              The rest of the console is unaffected. You can retry this view or navigate elsewhere from the sidebar.
            </div>
            <pre className="text-[#64748b] text-[10px] font-mono bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] p-3 text-left overflow-auto mb-4 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={this.reset}
              className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-4 py-2 text-[12px] text-[#22d3ee] cursor-pointer"
            >
              Retry view
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
