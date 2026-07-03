import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Unknown Route" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-[420px]">
          <div className="text-[#22d3ee] text-[40px] font-bold font-mono mb-2">404</div>
          <div className="text-[#e2e8f0] text-[15px] font-semibold mb-2">No console view at this address</div>
          <div className="text-[#94a3b8] text-[12px] leading-[1.6] mb-5">
            The requested route isn't part of the MissionMind console. Return to the Mission Dashboard or pick a view from the sidebar.
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-4 py-2 text-[12px] text-[#22d3ee] cursor-pointer"
          >
            Back to Mission Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
