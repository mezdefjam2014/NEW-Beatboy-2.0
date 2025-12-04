
import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  subLabel: string;
  value: number; // -12 to 12
  min: number;
  max: number;
  onChange: (val: number) => void;
  title?: string;
}

const Knob: React.FC<KnobProps> = ({ label, subLabel, value, min, max, onChange, title }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dy = startYRef.current - e.clientY;
      const range = max - min;
      const delta = (dy / 200) * range; // Sensitivity
      let newValue = startValRef.current + delta;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, max, min, onChange]);

  // Map value to angle (start -135deg, end 135deg)
  const percent = (value - min) / (max - min);
  const angle = -135 + (percent * 270);

  return (
    <div className="flex flex-col items-center gap-2 group select-none" title={title}>
      <div 
        className="relative w-16 h-16 cursor-ns-resize touch-none flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        {/* Outer Ring / Track Background */}
        <div className="absolute inset-0 rounded-full bg-zinc-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.05)] border border-zinc-800/50" />

        {/* Active Arc SVG */}
        <svg className="absolute inset-0 w-full h-full transform rotate-90 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" viewBox="0 0 36 36">
           <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#18181b" 
            strokeWidth="2.5"
            strokeDasharray="75, 100"
            strokeLinecap="round"
          />
           <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={percent > 0.5 ? '#10b981' : '#3f3f46'} // Emerald or Zinc
            strokeWidth="2.5"
            strokeDasharray={`${percent * 75}, 100`}
            strokeLinecap="round"
          />
        </svg>

        {/* Knob Body (Metallic Look) */}
        <div 
           className="absolute w-[70%] h-[70%] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-950 flex items-center justify-center transition-transform active:scale-95"
           style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Top Shine */}
          <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {/* Indicator Line */}
          <div className="w-1 h-3 bg-white rounded-full translate-y-[-10px] shadow-[0_0_5px_rgba(255,255,255,0.8)] z-10" />
          
          {/* Center Indent */}
          <div className="w-2 h-2 rounded-full bg-zinc-950 shadow-inner opacity-50 absolute" />
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest drop-shadow-md">{label}</div>
        <div className="text-[9px] font-mono text-zinc-600">{value > 0 ? '+' : ''}{value.toFixed(1)}dB</div>
      </div>
    </div>
  );
};

export default Knob;
