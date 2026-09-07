import { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator, X, Minus, RefreshCw, DollarSign, Delete } from 'lucide-react';

type CalcKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '.' | '+' | '-' | '*' | '/' | '=' | 'C' | 'CE' | '%' | '+/-'
  | '(' | ')';

const BUTTON_ROWS: CalcKey[][] = [
  ['C', 'CE', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['+/-', '0', '.', '='],
];

function formatDisplay(val: string): string {
  if (!val || val === 'Error') return val;
  const parts = val.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
}

export function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [justCalculated, setJustCalculated] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calc' | 'forex'>('calc');

  // Currency converter state
  const [usdRate, setUsdRate] = useState<number>(17909); // BI JISDOR default 21 Jul 2026
  const [usdRateManual, setUsdRateManual] = useState<string>('17909');
  const [usdInput, setUsdInput] = useState<string>('');
  const [idrInput, setIdrInput] = useState<string>('');
  const [rateSource, setRateSource] = useState<string>('Default BI');
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const fetchLiveRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      // Use frankfurter.app (free, no key needed)
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
      const data = await res.json();
      if (data?.rates?.IDR) {
        const rate = Math.round(data.rates.IDR);
        setUsdRate(rate);
        setUsdRateManual(String(rate));
        setRateSource(`Live (frankfurter.app)`);
      }
    } catch {
      setRateSource('Offline - pakai default');
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  useEffect(() => { fetchLiveRate(); }, [fetchLiveRate]);

  const applyManualRate = () => {
    const val = parseFloat(usdRateManual.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) {
      setUsdRate(val);
      setRateSource('Manual');
    }
  };

  const convertUsdToIdr = (val: string) => {
    setUsdInput(val);
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      setIdrInput(String(Math.round(num * usdRate)));
    } else {
      setIdrInput('');
    }
  };

  const convertIdrToUsd = (val: string) => {
    setIdrInput(val);
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      setUsdInput((num / usdRate).toFixed(4));
    } else {
      setUsdInput('');
    }
  };

  const formatIDR = (val: string) =>
    val ? new Intl.NumberFormat('id-ID').format(parseFloat(val)) : '';

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const calcRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPosition({ x: w - 320, y: h - 540 });
      initialized.current = true;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const newX = Math.max(0, Math.min(window.innerWidth - 300, dragStart.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setJustCalculated(false);
  };

  const handleCE = () => {
    setDisplay('0');
    setWaitingForOperand(false);
  };

  const handleDigit = (digit: string) => {
    if (justCalculated) {
      setDisplay(digit);
      setExpression(digit);
      setJustCalculated(false);
      return;
    }
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      const newDisplay = display === '0' ? digit : display + digit;
      if (newDisplay.length > 15) return;
      setDisplay(newDisplay);
    }
  };

  const handleDecimal = () => {
    if (justCalculated) {
      setDisplay('0.');
      setExpression('0.');
      setJustCalculated(false);
      return;
    }
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const prev = parseFloat(prevValue);
      let result: number;
      switch (operator) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '*': result = prev * current; break;
        case '/': result = current !== 0 ? prev / current : NaN; break;
        default: result = current;
      }
      const resultStr = isNaN(result) ? 'Error' : String(parseFloat(result.toFixed(10)));
      setDisplay(resultStr);
      setPrevValue(resultStr);
      setExpression(`${formatDisplay(resultStr)} ${op}`);
    } else {
      setPrevValue(display);
      setExpression(`${formatDisplay(display)} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
    setJustCalculated(false);
  };

  const handleEquals = () => {
    if (prevValue === null || operator === null) return;
    const prev = parseFloat(prevValue);
    const current = parseFloat(display);
    let result: number;
    switch (operator) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '*': result = prev * current; break;
      case '/': result = current !== 0 ? prev / current : NaN; break;
      default: result = current;
    }
    const resultStr = isNaN(result) ? 'Error' : String(parseFloat(result.toFixed(10)));
    const historyEntry = `${expression} ${formatDisplay(display)} = ${formatDisplay(resultStr)}`;
    setHistory(prev => [historyEntry, ...prev].slice(0, 10));
    setDisplay(resultStr);
    setExpression('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setJustCalculated(true);
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    if (prevValue !== null && operator) {
      const base = parseFloat(prevValue);
      const result = (base * current) / 100;
      setDisplay(String(parseFloat(result.toFixed(10))));
    } else {
      setDisplay(String(parseFloat((current / 100).toFixed(10))));
    }
  };

  const handleToggleSign = () => {
    const current = parseFloat(display);
    setDisplay(String(-current));
  };

  const handleKey = useCallback((key: CalcKey) => {
    switch (key) {
      case 'C': handleClear(); break;
      case 'CE': handleCE(); break;
      case '%': handlePercent(); break;
      case '+/-': handleToggleSign(); break;
      case '.': handleDecimal(); break;
      case '=': handleEquals(); break;
      case '+':
      case '-':
      case '*':
      case '/': handleOperator(key); break;
      default: handleDigit(key); break;
    }
    // Flash the active key
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 120);
  }, [handleClear, handleCE, handlePercent, handleToggleSign, handleDecimal, handleEquals, handleOperator, handleDigit]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user types in an input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      let mapped: CalcKey | null = null;
      if (e.key >= '0' && e.key <= '9') mapped = e.key as CalcKey;
      else if (e.key === '.') mapped = '.';
      else if (e.key === '+') mapped = '+';
      else if (e.key === '-') mapped = '-';
      else if (e.key === '*') mapped = '*';
      else if (e.key === '/') { e.preventDefault(); mapped = '/'; }
      else if (e.key === '%') mapped = '%';
      else if (e.key === 'Enter' || e.key === '=') mapped = '=';
      else if (e.key === 'Escape') { handleClear(); setActiveKey('C'); setTimeout(() => setActiveKey(null), 120); return; }
      else if (e.key === 'Backspace') {
        // Delete last digit
        e.preventDefault();
        setDisplay(prev => {
          if (prev.length <= 1 || prev === 'Error') return '0';
          return prev.slice(0, -1);
        });
        setActiveKey('CE');
        setTimeout(() => setActiveKey(null), 120);
        return;
      }

      if (mapped) {
        e.preventDefault();
        handleKey(mapped);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isMinimized, handleKey]);

  const getButtonStyle = (key: CalcKey): string => {
    const isActive = activeKey === key;
    const base = 'flex items-center justify-center rounded-xl text-sm font-bold min-h-[40px] h-full w-full transition-all duration-100 active:scale-95 select-none cursor-pointer ';
    if (key === '=') return base + (isActive ? 'bg-[#a8874a] scale-95 shadow-inner' : 'bg-[#c8a96e] text-white shadow-lg hover:bg-[#b8975a] active:bg-[#a8874a]') + ' text-white';
    if (['+', '-', '*', '/'].includes(key)) return base + (isActive ? 'bg-primary/50 scale-95' : 'bg-primary/20 hover:bg-primary/30') + ' text-primary';
    if (['C', 'CE', '%'].includes(key)) return base + (isActive ? 'bg-red-500/40 scale-95' : 'bg-red-500/15 hover:bg-red-500/25') + ' text-red-400';
    if (key === '+/-') return base + (isActive ? 'bg-background scale-95' : 'bg-card border border-border hover:bg-background') + ' text-textSecondary';
    return base + (isActive ? 'bg-primary/20 border-primary scale-95' : 'bg-card border border-border hover:bg-background hover:border-primary/30') + ' text-textPrimary';
  };

  const getKeyLabel = (key: CalcKey): React.ReactNode => {
    if (key === '*') return '×';
    if (key === '/') return '÷';
    if (key === '+/-') return '±';
    if (key === 'CE') return <Delete className="w-4 h-4" />;
    return key;
  };

  useEffect(() => {
    if (!calcRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Default base is 290x400
        const scale = Math.min(width / 290, height / 400);
        (entry.target as HTMLElement).style.setProperty('--calc-scale', scale.toString());
      }
    });
    observer.observe(calcRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  return (
    <>
      <style>{`
        .scalable-calc {
          --calc-scale: 1;
        }
        .scalable-calc .text-xs { font-size: calc(12px * var(--calc-scale)) !important; line-height: calc(16px * var(--calc-scale)) !important; }
        .scalable-calc .text-sm { font-size: calc(14px * var(--calc-scale)) !important; line-height: calc(20px * var(--calc-scale)) !important; }
        .scalable-calc .text-lg { font-size: calc(18px * var(--calc-scale)) !important; line-height: calc(28px * var(--calc-scale)) !important; }
        .scalable-calc .text-2xl { font-size: calc(24px * var(--calc-scale)) !important; line-height: calc(32px * var(--calc-scale)) !important; }
        .scalable-calc .text-3xl { font-size: calc(30px * var(--calc-scale)) !important; line-height: calc(36px * var(--calc-scale)) !important; }
        .scalable-calc .text-\\[9px\\] { font-size: calc(9px * var(--calc-scale)) !important; line-height: calc(12px * var(--calc-scale)) !important; }
        .scalable-calc .text-\\[10px\\] { font-size: calc(10px * var(--calc-scale)) !important; line-height: calc(14px * var(--calc-scale)) !important; }
        .scalable-calc .text-\\[11px\\] { font-size: calc(11px * var(--calc-scale)) !important; line-height: calc(16px * var(--calc-scale)) !important; }
        
        .scalable-calc .w-3 { width: calc(12px * var(--calc-scale)) !important; }
        .scalable-calc .h-3 { height: calc(12px * var(--calc-scale)) !important; }
        .scalable-calc .w-4 { width: calc(16px * var(--calc-scale)) !important; }
        .scalable-calc .h-4 { height: calc(16px * var(--calc-scale)) !important; }
        .scalable-calc .w-6 { width: calc(24px * var(--calc-scale)) !important; }
        .scalable-calc .h-6 { height: calc(24px * var(--calc-scale)) !important; }
      `}</style>

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
          className="w-13 h-13 p-3.5 rounded-2xl bg-[#c8a96e] text-white shadow-2xl hover:bg-[#b8975a] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          title="Buka Kalkulator"
        >
          <Calculator className="w-6 h-6" />
        </button>
      )}

      {/* Calculator Panel */}
      {isOpen && (
        <div
          ref={calcRef}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999,
            minWidth: activeTab === 'forex' ? '310px' : '290px',
            minHeight: '400px',
            resize: 'both',
            overflow: 'hidden',
            userSelect: 'none',
          }}
          className="rounded-2xl shadow-2xl border border-border/60 backdrop-blur-sm bg-card flex flex-col scalable-calc"
          tabIndex={-1}
        >
          {/* Title Bar */}
          <div
            onMouseDown={onMouseDown}
            className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#3d5a80] to-[#2c4a70] cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-white/80" />
              <span className="text-white text-xs font-semibold tracking-wide">Kalkulator</span>
              <span className="text-white/40 text-[9px] font-normal">⌨ keyboard aktif</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onMouseDown={e => e.stopPropagation()}
              >
                <Minus className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/60 flex items-center justify-center transition-colors"
                onMouseDown={e => e.stopPropagation()}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-background/70 border-b border-border">
            <button
              onClick={() => setActiveTab('calc')}
              onMouseDown={e => e.stopPropagation()}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors ${
                activeTab === 'calc'
                  ? 'text-primary border-b-2 border-primary bg-card'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Calculator className="w-3 h-3" /> Kalkulator
            </button>
            <button
              onClick={() => setActiveTab('forex')}
              onMouseDown={e => e.stopPropagation()}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors ${
                activeTab === 'forex'
                  ? 'text-[#c8a96e] border-b-2 border-[#c8a96e] bg-card'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <DollarSign className="w-3 h-3" /> Kurs USD
            </button>
          </div>

          {!isMinimized && activeTab === 'forex' && (
            <div className="bg-card px-4 py-3 space-y-3 flex-1 overflow-auto">
              {/* Rate Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-textSecondary">Kurs USD/IDR</p>
                  <p className="text-lg font-bold text-[#c8a96e]">
                    Rp {new Intl.NumberFormat('id-ID').format(usdRate)}
                  </p>
                  <p className="text-[9px] text-textSecondary/60">{rateSource}</p>
                </div>
                <button
                  onClick={fetchLiveRate}
                  disabled={isLoadingRate}
                  className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                  title="Refresh kurs live"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Manual Rate Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-textSecondary block mb-1">Input Kurs Manual (Rp)</label>
                  <input
                    type="number"
                    value={usdRateManual}
                    onChange={e => setUsdRateManual(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyManualRate()}
                    className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/60"
                    placeholder="cth: 17900"
                  />
                </div>
                <button
                  onClick={applyManualRate}
                  className="mt-4 px-3 py-1.5 text-[10px] font-bold bg-[#c8a96e]/20 text-[#c8a96e] rounded-lg hover:bg-[#c8a96e]/30 border border-[#c8a96e]/30 transition-colors whitespace-nowrap"
                >
                  Pakai
                </button>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                {/* USD -> IDR */}
                <div>
                  <label className="text-[9px] text-textSecondary block mb-1">Jumlah USD ($)</label>
                  <input
                    type="number"
                    value={usdInput}
                    onChange={e => convertUsdToIdr(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 font-mono"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-center">
                  <span className="text-textSecondary text-lg">⇅</span>
                </div>
                {/* IDR -> USD */}
                <div>
                  <label className="text-[9px] text-textSecondary block mb-1">Jumlah IDR (Rp)</label>
                  <input
                    type="number"
                    value={idrInput}
                    onChange={e => convertIdrToUsd(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 font-mono"
                    placeholder="0"
                  />
                </div>

                {/* Result display */}
                {usdInput && idrInput && (
                  <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/20 rounded-xl p-3 mt-1">
                    <p className="text-center text-xs text-textSecondary">
                      <span className="font-bold text-textPrimary">${Number(usdInput).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
                      <span className="mx-2 text-[#c8a96e]">→</span>
                      <span className="font-bold text-[#c8a96e]">Rp {formatIDR(idrInput)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Multiplier */}
              <div className="border-t border-border pt-2">
                <p className="text-[9px] text-textSecondary mb-1.5">Konversi Cepat</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[100, 500, 1000, 5000, 10000, 50000].map(usd => (
                    <button
                      key={usd}
                      onClick={() => convertUsdToIdr(String(usd))}
                      className="text-[10px] py-1 px-1 bg-background border border-border rounded-lg hover:border-[#c8a96e]/40 hover:bg-[#c8a96e]/5 text-textSecondary hover:text-textPrimary transition-colors"
                    >
                      ${new Intl.NumberFormat('en-US').format(usd)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isMinimized && activeTab === 'calc' && (
            <div className="bg-card flex flex-col flex-1 h-full">
              {/* Display */}
              <div className="px-4 pt-3 pb-2 bg-background/50">
                {/* Expression line */}
                <div className="text-right text-textSecondary text-xs h-4 truncate">
                  {expression || '\u00A0'}
                </div>
                {/* Main display */}
                <div className="text-right text-3xl font-light text-textPrimary mt-1 truncate" style={{ letterSpacing: '-1px' }}>
                  {display === 'Error' ? (
                    <span className="text-red-400 text-2xl">Error</span>
                  ) : (
                    formatDisplay(display)
                  )}
                </div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="mx-3 mb-2 max-h-16 overflow-y-auto scrollbar-hide">
                  {history.slice(0, 3).map((h, i) => (
                    <div key={i} className="text-right text-[10px] text-textSecondary/60 truncate leading-4">{h}</div>
                  ))}
                </div>
              )}

              {/* Buttons */}
              <div className="px-3 pb-3 grid grid-cols-4 gap-2 flex-1 mt-2">
                {BUTTON_ROWS.flat().map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className={getButtonStyle(key)}
                  >
                    {getKeyLabel(key)}
                  </button>
                ))}
              </div>

              {/* Clear History */}
              {history.length > 0 && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => setHistory([])}
                    className="w-full text-center text-[10px] text-textSecondary/50 hover:text-textSecondary transition-colors"
                  >
                    Hapus Riwayat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
