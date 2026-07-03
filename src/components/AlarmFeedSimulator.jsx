import { useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext.jsx';

// Demonstrates the toast system firing for new alarms as they occur,
// independent of the static ALARMS list shown on the alarm board. In a
// real deployment this would subscribe to the live FDIR/alarm event
// stream instead of cycling a fixed demo queue.
const SIMULATED_ALARMS = [
  { severity: 'warning',  title: 'Thruster Temp Crossed +40°C', detail: 'THM_THR_T now trending above the 5°C/hr caution threshold.' },
  { severity: 'critical', title: 'Battery Discharge Rate Elevated', detail: 'PWR_BAT_PCT declining faster than the power-safe-mode model predicted.' },
  { severity: 'info',     title: 'SA-DIAG-01 String Sweep Complete', detail: 'Diagnostic finished — string 6A flagged for review.' },
  { severity: 'warning',  title: 'Downlink Volume Below Target', detail: 'COM_RATE reduction has cut this pass\'s data volume ~31% below plan.' },
];

export default function AlarmFeedSimulator() {
  const { addToast } = useToast();
  const idxRef = useRef(0);

  useEffect(() => {
    const fireNext = () => {
      const alarm = SIMULATED_ALARMS[idxRef.current % SIMULATED_ALARMS.length];
      idxRef.current += 1;
      addToast(alarm);
    };
    const first = setTimeout(fireNext, 4000);
    const interval = setInterval(fireNext, 45000);
    return () => { clearTimeout(first); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
