import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'syabaab' && password === '229308') {
      onLogin();
    } else {
      setError('ID Pengguna atau Kata Sandi salah.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Neomorphic Elements & Waves */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Pure Neomorphic ANSA Spiral Logo (Right Side) */}
        <div className="absolute -right-[10%] top-[5%] w-[800px] h-[800px] opacity-95 animate-[pulse_12s_ease-in-out_infinite]">
          <svg width="100%" height="100%" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="pureNeomorph" x="-20%" y="-20%" width="140%" height="140%">
                {/* Outer Light Shadow */}
                <feOffset dx="-12" dy="-12" in="SourceAlpha" result="outLightOffset"/>
                <feGaussianBlur stdDeviation="15" in="outLightOffset" result="outLightBlur"/>
                <feFlood floodColor="#ffffff" floodOpacity="1"/>
                <feComposite operator="in" in2="outLightBlur" result="outLight"/>
                
                {/* Outer Dark Shadow */}
                <feOffset dx="15" dy="15" in="SourceAlpha" result="outDarkOffset"/>
                <feGaussianBlur stdDeviation="20" in="outDarkOffset" result="outDarkBlur"/>
                <feFlood floodColor="#d1d9e6" floodOpacity="0.9"/>
                <feComposite operator="in" in2="outDarkBlur" result="outDark"/>

                {/* Inner Dark Shadow */}
                <feOffset dx="12" dy="12" in="SourceAlpha" result="inDarkOffset"/>
                <feGaussianBlur stdDeviation="12" in="inDarkOffset" result="inDarkBlur"/>
                <feComposite operator="out" in="SourceAlpha" in2="inDarkBlur" result="inDarkInverse"/>
                <feFlood floodColor="#c0cadb" floodOpacity="0.8"/>
                <feComposite operator="in" in2="inDarkInverse" result="inDark"/>
                <feComposite operator="in" in="inDark" in2="SourceAlpha" result="inDarkFinal"/>

                {/* Inner Light Shadow */}
                <feOffset dx="-12" dy="-12" in="SourceAlpha" result="inLightOffset"/>
                <feGaussianBlur stdDeviation="12" in="inLightOffset" result="inLightBlur"/>
                <feComposite operator="out" in="SourceAlpha" in2="inLightBlur" result="inLightInverse"/>
                <feFlood floodColor="#ffffff" floodOpacity="1"/>
                <feComposite operator="in" in2="inLightInverse" result="inLight"/>
                <feComposite operator="in" in="inLight" in2="SourceAlpha" result="inLightFinal"/>

                {/* Merge All */}
                <feMerge>
                  <feMergeNode in="outLight"/>
                  <feMergeNode in="outDark"/>
                  <feMergeNode in="SourceGraphic"/>
                  <feMergeNode in="inDarkFinal"/>
                  <feMergeNode in="inLightFinal"/>
                </feMerge>
              </filter>
            </defs>
            
            <g filter="url(#pureNeomorph)">
              <path 
                d="M 600 400 
                   A 200 200 0 0 0 200 400
                   A 150 150 0 0 0 500 400
                   A 100 100 0 0 0 300 400
                   A 50 50 0 0 0 400 400"
                fill="none" 
                stroke="#F0F4F8" 
                strokeWidth="75" 
                strokeLinecap="round"
                transform="rotate(-20 400 400)" 
              />
            </g>
          </svg>
        </div>
        
        {/* Floating Neomorphic Bubbles (Bottom Left) */}
        <div 
          className="absolute left-[8%] bottom-[20%] w-24 h-24 rounded-full border-[10px] border-[#F0F4F8] opacity-80 animate-[pulse_8s_ease-in-out_infinite] flex items-center justify-center bg-[#F0F4F8]"
          style={{ boxShadow: '10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff, inset 8px 8px 16px #d1d9e6, inset -8px -8px 16px #ffffff' }}
        >
          <ShieldCheck className="w-8 h-8 text-[#1A2C4D] opacity-60" />
        </div>
        <div 
          className="absolute left-[20%] bottom-[12%] w-12 h-12 rounded-full bg-[#F0F4F8] opacity-90 animate-[pulse_6s_ease-in-out_infinite_reverse]"
          style={{ boxShadow: '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff, inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff' }}
        ></div>
        <div 
          className="absolute left-[4%] bottom-[8%] w-6 h-6 rounded-full bg-[#F0F4F8] opacity-70 animate-[pulse_10s_ease-in-out_infinite]"
          style={{ boxShadow: '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff' }}
        ></div>
        
        {/* Elegant Abstract Wave Bottom Left */}
        <svg className="absolute bottom-0 left-0 w-full h-[60vh] opacity-60 text-gray-200" preserveAspectRatio="none" viewBox="0 0 1440 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: '#D1D9E6', stopOpacity: 0.8}} />
              <stop offset="100%" style={{stopColor: '#F0F4F8', stopOpacity: 0.1}} />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 0.6}} />
              <stop offset="100%" style={{stopColor: '#F0F4F8', stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
          <path fill="url(#grad1)" d="M0,320L60,309.3C120,299,240,277,360,266.7C480,256,600,256,720,261.3C840,267,960,277,1080,266.7C1200,256,1320,224,1380,208L1440,192L1440,400L1380,400C1320,400,1200,400,1080,400C960,400,840,400,720,400C600,400,480,400,360,400C240,400,120,400,60,400L0,400Z"></path>
          <path fill="url(#grad2)" d="M0,256L60,266.7C120,277,240,299,360,288C480,277,600,235,720,224C840,213,960,235,1080,234.7C1200,235,1320,213,1380,202.7L1440,192L1440,400L1380,400C1320,400,1200,400,1080,400C960,400,840,400,720,400C600,400,480,400,360,400C240,400,120,400,60,400L0,400Z"></path>
        </svg>
      </div>

      <div className="container mx-auto px-6 z-10 flex flex-col lg:flex-row items-center justify-between max-w-6xl h-full">
        
        {/* Left Side: Branding */}
        <div className="w-full lg:w-1/2 mb-12 lg:mb-0 lg:pr-16 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <img src="/ansa-icon.png" alt="ANSA Logo" className="w-[42px] h-[42px] object-contain drop-shadow-md" />
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight flex items-center gap-1.5">
                <span className="text-[#1A2C4D]">ANSA</span> 
                <span className="text-primary">Enterprise</span>
              </h1>
            </div>
          </div>
          
          <div className="mb-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A2C4D]/5 border border-[#1A2C4D]/10 text-[#1A2C4D] text-xs font-bold tracking-widest uppercase">
            Sistem LODE
          </div>
          <h2 className="text-[2.8rem] font-bold text-[#1A2C4D] leading-[1.15] mb-6 tracking-tight">
            Lifecycle<br/>Operation Data-Analysis<br/>
            <span className="relative inline-block mt-2">
              Engine
              {/* Yellow Underline */}
              <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-[#FFC107] rounded-full"></span>
            </span>
          </h2>
          <p className="text-[15px] text-gray-500 font-medium mt-6 leading-relaxed max-w-[90%]">
            <strong className="text-[#1A2C4D]">Project & Corporate Finance System</strong><br/>
            Peta urat dana proyek Anda untuk mengidentifikasi aliran modal dan menambang profitabilitas maksimal.
          </p>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-[420px]">
          <div className="bg-white/90 backdrop-blur-xl p-9 rounded-[32px] shadow-[0_20px_60px_rgb(0,0,0,0.06)] border border-white">
            <h3 className="text-[26px] font-bold text-gray-900 mb-1.5">Selamat Datang!</h3>
            <p className="text-gray-500 text-[13px] font-medium mb-8">Masuk untuk mengakses Layanan ANSA Finance</p>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">ID Pengguna</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-[#1A2C4D]" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm font-medium shadow-sm"
                    placeholder="Masukkan ID Pengguna"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-[#1A2C4D]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm font-medium shadow-sm"
                    placeholder="Masukkan Kata Sandi"
                    autoComplete="new-password"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Fake captcha/verification */}
              <div className="pt-3">
                <p className="text-[13px] font-semibold text-gray-700 mb-2">Verifikasi</p>
                <div className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <input type="checkbox" id="verify" className="w-[18px] h-[18px] text-[#1A2C4D] rounded border-gray-300 focus:ring-[#1A2C4D] cursor-pointer" required />
                  <label htmlFor="verify" className="text-[13px] font-medium text-gray-700 select-none cursor-pointer">Terverifikasi</label>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 pt-1">
                <a href="#" className="text-[13px] text-gray-500 hover:text-primary transition-colors font-medium">Lupa Kata Sandi?</a>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-[15px] font-bold text-white bg-[#1A2C4D] hover:bg-[#111d33] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A2C4D] transition-all mt-6"
              >
                Masuk
              </button>
            </form>
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} ANSA Enterprise. Seluruh hak cipta dilindungi.
          </div>
        </div>
        
      </div>
    </div>
  );
}
