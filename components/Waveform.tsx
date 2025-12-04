
import React, { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  buffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onScrub: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  isPlaying: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ buffer, currentTime, duration, onScrub, onScrubStart, onScrubEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Redraw whenever relevant props change, specifically currentTime
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Handle High DPI
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Resize only if needed to avoid flicker, but ensure resolution matches
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // --- Background Grid ---
      ctx.strokeStyle = '#27272a'; // Zinc 800
      ctx.lineWidth = 1;
      
      // Horizontal Center
      ctx.beginPath();
      ctx.moveTo(0, height/2);
      ctx.lineTo(width, height/2);
      ctx.stroke();

      // Vertical Grid
      ctx.strokeStyle = '#18181b'; // Zinc 900
      const gridStep = width / 10;
      for(let i=1; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(i*gridStep, 0);
        ctx.lineTo(i*gridStep, height);
        ctx.stroke();
      }

      // --- Waveform Drawing ---
      const validDuration = duration > 0 ? duration : 1;
      const playPos = (currentTime / validDuration) * width;

      if (buffer) {
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = (height / 2) * 0.9;

        ctx.beginPath();
        
        // Gradient for bars
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#71717a'); // Zinc 500
        grad.addColorStop(0.5, '#f4f4f5'); // Zinc 100
        grad.addColorStop(1, '#71717a');
        ctx.fillStyle = grad;

        // Draw bars
        for (let i = 0; i < width; i+=2) { 
          let max = 0;
          const index = Math.floor(i * step); 
          if (index < data.length) {
              for (let j = 0; j < step; j++) {
                const val = Math.abs(data[index + j]);
                if (val > max) max = val;
              }
          }
          const barHeight = Math.max(1, max * amp);
          ctx.fillRect(i, (height/2) - barHeight, 1.5, barHeight * 2);
        }

        // --- Active Region (Played) ---
        // We use source-atop to color only the bars that have been played
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#10b981'; // Emerald 500
        ctx.fillRect(0, 0, playPos, height);
        ctx.globalCompositeOperation = 'source-over';

        // --- Playhead ---
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red 500
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 10;
        ctx.moveTo(playPos, 0);
        ctx.lineTo(playPos, height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Playhead Cap
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(playPos - 5, 0);
        ctx.lineTo(playPos + 5, 0);
        ctx.lineTo(playPos, 8);
        ctx.fill();

      } else {
        // Empty State
        ctx.fillStyle = '#52525b';
        ctx.font = '600 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('NO AUDIO SIGNAL', width / 2, height / 2 + 4);
      }
      
      // Glass Reflection Overlay
      const glassGrad = ctx.createLinearGradient(0, 0, 0, height/2);
      glassGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
      glassGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(0, 0, width, height/2);
    };

    draw();
    
  }, [buffer, currentTime, duration]); // Reacts to currentTime changes driven by parent rAF

  const updateScrub = (e: React.PointerEvent) => {
     if (!canvasRef.current) return;
     const rect = canvasRef.current.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const width = rect.width;
     const percent = Math.min(1, Math.max(0, x / width));
     onScrub(percent * duration);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!buffer) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    if (onScrubStart) onScrubStart();
    updateScrub(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateScrub(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (onScrubEnd) onScrubEnd();
    }
  };

  return (
    <div 
      className={`relative w-full h-48 bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] ring-1 ring-white/5 touch-none ${buffer ? (isDragging ? 'cursor-grabbing' : 'cursor-col-resize') : 'cursor-default'}`} 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
    </div>
  );
};

export default Waveform;
