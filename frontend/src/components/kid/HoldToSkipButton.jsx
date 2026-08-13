import { useRef, useState } from 'react';

const HOLD_MS = 1000;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function HoldToSkipButton({ onSkip }) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(null);

  const start = () => {
    setHolding(true);
    timerRef.current = setTimeout(() => {
      setHolding(false);
      onSkip();
    }, HOLD_MS);
  };

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to skip song"
      className="relative flex h-14 w-14 shrink-0 touch-none select-none items-center justify-center rounded-full bg-violet-500 text-2xl text-white shadow-md"
    >
      <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={RADIUS} fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="4" />
        <circle
          cx="30"
          cy="30"
          r={RADIUS}
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={holding ? 0 : CIRCUMFERENCE}
          style={{ transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear` : 'none' }}
        />
      </svg>
      <span className="relative">⏭</span>
    </button>
  );
}
