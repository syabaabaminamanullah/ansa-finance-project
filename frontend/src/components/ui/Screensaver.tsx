import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette, Type } from 'lucide-react';

export type ClockTheme = 'classic' | 'gold' | 'cyan' | 'midnight' | 'glass';
export type ClockFont = 'bebas' | 'oswald' | 'modern' | 'impact' | 'mono';

export const CLOCK_FONTS: Record<ClockFont, { name: string; family: string }> = {
  bebas: { name: 'Split-Flap (Bebas)', family: '"Bebas Neue", "Oswald", "Arial Narrow", sans-serif' },
  oswald: { name: 'Oswald Bold', family: '"Oswald", "Arial Narrow", sans-serif' },
  modern: { name: 'Modern Sans', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  impact: { name: 'Heavy Impact', family: 'Impact, sans-serif' },
  mono: { name: 'Tech Monospace', family: '"Consolas", "Courier New", monospace' },
};

export const CLOCK_THEMES: Record<ClockTheme, {
  name: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  colonColor: string;
  glowColor?: string;
  swatchBg: string;
}> = {
  classic: {
    name: 'Classic Dark',
    cardBg: '#1a1a1a',
    textColor: '#d1d1d1',
    borderColor: 'border-neutral-800',
    colonColor: 'text-neutral-500',
    swatchBg: 'bg-neutral-800',
  },
  gold: {
    name: 'Luxury Gold',
    cardBg: '#1c1917',
    textColor: '#eab308',
    borderColor: 'border-yellow-600/40',
    colonColor: 'text-yellow-500',
    glowColor: '0 10px 40px rgba(234, 179, 8, 0.25)',
    swatchBg: 'bg-yellow-500',
  },
  cyan: {
    name: 'Cyberpunk Cyan',
    cardBg: '#0f172a',
    textColor: '#38bdf8',
    borderColor: 'border-sky-500/40',
    colonColor: 'text-sky-400',
    glowColor: '0 10px 40px rgba(56, 189, 248, 0.3)',
    swatchBg: 'bg-sky-400',
  },
  midnight: {
    name: 'Midnight Purple',
    cardBg: '#1e1b4b',
    textColor: '#c084fc',
    borderColor: 'border-purple-500/40',
    colonColor: 'text-purple-400',
    glowColor: '0 10px 40px rgba(192, 132, 252, 0.25)',
    swatchBg: 'bg-purple-400',
  },
  glass: {
    name: 'Frosted Glass',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    textColor: '#ffffff',
    borderColor: 'border-white/20',
    colonColor: 'text-white/70',
    swatchBg: 'bg-white/40',
  },
};

export function Screensaver() {
  const [isIdle, setIsIdle] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [time, setTime] = useState(new Date());
  const [currentTheme, setCurrentTheme] = useState<ClockTheme>(() => {
    return (localStorage.getItem('screensaver_theme') as ClockTheme) || 'classic';
  });
  const [currentFont, setCurrentFont] = useState<ClockFont>(() => {
    return (localStorage.getItem('screensaver_font') as ClockFont) || 'bebas';
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Waktu idle 2 menit (120000 ms)
  const IDLE_TIMEOUT = 120000;

  const handleActivity = useCallback((e: Event) => {
    // Jangan matikan screensaver saat mengklik tombol pengontrol
    const target = e.target as HTMLElement;
    if (target?.closest('.control-btn')) {
      return;
    }

    // Jika screensaver menyala, atur agar hanya klik atau spasi yang bisa mematikannya
    if (isIdle) {
      if (e.type === 'mousemove' || e.type === 'scroll') {
        return;
      }
      if (e.type === 'keydown' && (e as KeyboardEvent).code !== 'Space') {
        return;
      }

      // Mulai animasi slide up saat dimatikan
      if (!isExiting) {
        setIsExiting(true);
        setTimeout(() => {
          setIsIdle(false);
          setIsExiting(false);
        }, 700);
      }
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
  }, [isIdle, isExiting]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [handleActivity]);

  useEffect(() => {
    if (isIdle) {
      setTime(new Date());
      const interval = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [isIdle]);

  if (!isIdle && !isExiting) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = time.toLocaleDateString('id-ID', dateOptions);

  const themeConfig = CLOCK_THEMES[currentTheme];
  const fontConfig = CLOCK_FONTS[currentFont];

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-neutral-900 flex flex-col items-center justify-center select-none overflow-hidden transition-transform duration-700 ease-in-out ${
        isExiting ? '-translate-y-full' : 'translate-y-0 animate-in fade-in duration-700'
      }`}
    >
      <ParticleNetwork />
      
      {/* Dynamic theme style overrides */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600;700&display=swap');

        .flip-clock-perspective {
          perspective: 1000px;
        }
        .flip-top, .flip-bottom {
          position: absolute;
          left: 0; right: 0;
          height: 50%;
          overflow: hidden;
          background-color: ${themeConfig.cardBg};
          ${currentTheme === 'glass' ? 'backdrop-filter: blur(12px);' : ''}
        }
        .flip-top {
          top: 0;
          transform-origin: bottom;
          border-top-left-radius: 1.5rem;
          border-top-right-radius: 1.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.5);
        }
        .flip-bottom {
          bottom: 0;
          transform-origin: top;
          border-bottom-left-radius: 1.5rem;
          border-bottom-right-radius: 1.5rem;
          border-top: 1px solid rgba(0,0,0,0.5);
        }
        .flip-text {
          position: absolute;
          left: 0; right: 0;
          height: 200%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${themeConfig.textColor};
          font-family: ${fontConfig.family};
        }
        .flip-top .flip-text {
          top: 0;
        }
        .flip-bottom .flip-text {
          bottom: 0;
        }
        
        @keyframes flipTop {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }
        @keyframes flipBottom {
          0% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        
        .animate-flip-top {
          animation: flipTop 250ms ease-in forwards;
          backface-visibility: hidden;
        }
        .animate-flip-bottom {
          animation: flipBottom 250ms ease-out 250ms forwards;
          transform: rotateX(90deg);
          backface-visibility: hidden;
        }
      `}</style>

      {/* Date */}
      <div className="text-neutral-400 text-2xl md:text-4xl font-medium tracking-widest mb-12 uppercase">
        {dateString}
      </div>

      {/* Flip Clock Cards */}
      <div className="flex items-center gap-4 md:gap-8">
        <AnimatedFlipCard val={hours} theme={themeConfig} font={fontConfig} />
        <span className={`${themeConfig.colonColor} text-6xl md:text-8xl animate-pulse pb-8 transition-colors duration-500`}>:</span>
        <AnimatedFlipCard val={minutes} theme={themeConfig} font={fontConfig} />
        <span className={`${themeConfig.colonColor} text-6xl md:text-8xl animate-pulse pb-8 transition-colors duration-500`}>:</span>
        <AnimatedFlipCard val={seconds} theme={themeConfig} font={fontConfig} />
      </div>

      {/* Watermark */}
      <div className="absolute bottom-6 flex flex-col items-center opacity-40">
        <span className="text-neutral-500 text-sm tracking-widest uppercase mb-1">Dibuat Oleh</span>
        <span className="text-neutral-400 font-bold tracking-widest text-lg">ANSA Enterprise</span>
      </div>
    </div>
  );
}

function AnimatedFlipCard({ 
  val, 
  theme, 
  font 
}: { 
  val: string; 
  theme: typeof CLOCK_THEMES[ClockTheme]; 
  font: typeof CLOCK_FONTS[ClockFont] 
}) {
  const [prevVal, setPrevVal] = useState(val);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (val !== prevVal) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setPrevVal(val);
        setIsFlipping(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [val, prevVal]);

  return (
    <div 
      className={`relative rounded-2xl md:rounded-3xl w-36 h-48 md:w-56 md:h-72 flip-clock-perspective border ${theme.borderColor} transition-colors duration-500`}
      style={{ boxShadow: theme.glowColor || '0 10px 40px rgba(0,0,0,0.8)' }}
    >
      {/* 1. Static Top (Shows NEW value) */}
      <div className="flip-top z-10">
        <div className="flip-text font-bold text-8xl md:text-[11.5rem] leading-none tracking-tighter" style={{ fontFamily: font.family }}>
          {val}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* 2. Static Bottom (Shows OLD value) */}
      <div className="flip-bottom z-10">
        <div className="flip-text font-bold text-8xl md:text-[11.5rem] leading-none tracking-tighter" style={{ fontFamily: font.family }}>
          {isFlipping ? prevVal : val}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      {isFlipping && (
        <>
          {/* 3. Flipping Top (Shows OLD value, flips down to -90deg) */}
          <div className="flip-top z-20 animate-flip-top shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
            <div className="flip-text font-bold text-8xl md:text-[11.5rem] leading-none tracking-tighter" style={{ fontFamily: font.family }}>
              {prevVal}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>

          {/* 4. Flipping Bottom (Shows NEW value, flips down from 90deg) */}
          <div className="flip-bottom z-20 animate-flip-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <div className="flip-text font-bold text-8xl md:text-[11.5rem] leading-none tracking-tighter" style={{ fontFamily: font.family }}>
              {val}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        </>
      )}

      {/* Horizontal center split line overlay */}
      <div className="absolute inset-x-0 top-1/2 h-[4px] bg-neutral-950 -translate-y-1/2 z-30 shadow-sm" />
    </div>
  );
}

function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
    const maxParticles = Math.min(Math.floor((w * h) / 15000), 100);

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 1.5 + 0.8,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < maxParticles; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce edges
        if (p.x < 0 || p.x > w) p.vx = -p.vx;
        if (p.y < 0 || p.y > h) p.vy = -p.vy;

        // Add soft dim glow effect for dots
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(125, 211, 252, 0.3)';

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
        ctx.fill();

        // Connect particles
        for (let j = i + 1; j < maxParticles; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = `rgba(186, 230, 253, ${0.4 - dist / 400})`;
            ctx.stroke();
          }
        }

        // Connect to mouse
        const dxMouse = p.x - mouseX;
        const dyMouse = p.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < 230) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
          ctx.strokeStyle = `rgba(125, 211, 252, ${0.75 - distMouse / 320})`;
          ctx.stroke();
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-90 pointer-events-none" />;
}
