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
      aria-label="Parent settings"
      className="h-8 w-8 rounded-full opacity-20"
    />
  );
}
