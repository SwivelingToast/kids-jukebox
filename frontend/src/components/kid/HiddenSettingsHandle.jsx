import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const LONG_PRESS_MS = 1600;

export default function HiddenSettingsHandle() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const start = () => {
    timerRef.current = setTimeout(() => navigate('/parent'), LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Parent settings"
      className="fixed bottom-8 right-8 z-50 h-8 w-8 touch-none select-none rounded-full bg-violet-950 opacity-40"
    />
  );
}
