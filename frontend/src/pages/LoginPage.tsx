import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Animated Waves (Coretax inspired) */}
      <div className="absolute inset-0 z-0 opacity-70 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#E8F0FE] to-transparent rounded-full mix-blend-multiply blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-gradient-to-tl from-[#FDE8D0]/60 to-transparent rounded-full mix-blend-multiply blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }}></div>
        
        {/* Soft SVG Waves at bottom */}
        <svg className="absolute bottom-0 w-full h-[40vh] text-white opacity-40" preserveAspectRatio="none" viewBox="0 0 1440 320" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,256L48,245.3C96,235,192,213,288,208C384,203,480,213,576,213.3C672,213,768,203,864,181.3C960,160,1056,128,1152,133.3C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <div className="container mx-auto px-6 z-10 flex flex-col lg:flex-row items-center justify-between max-w-6xl h-full">
        
        {/* Left Side: Branding */}
        <div className="w-full lg:w-1/2 mb-12 lg:mb-0 lg:pr-16 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-sm border border-gray-100">
              <span className="text-[#1A2C4D]">A</span><span className="text-primary">E</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-1">
                <span className="text-[#1A2C4D]">ANSA</span> 
                <span className="text-primary">Enterprise</span>
              </h1>
            </div>
          </div>
          
          <h2 className="text-[2.75rem] font-bold text-[#1A2C4D] leading-[1.1] mb-5 tracking-tight">
            Sistem Inti<br/>Administrasi<br/>Keuangan
          </h2>
          <p className="text-lg text-gray-600 font-medium">
            Tumbuh Bersama, ANSA Tangguh
          </p>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-[420px]">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <h3 className="text-2xl font-bold text-gray-900 mb-1.5">Selamat Datang!</h3>
            <p className="text-gray-500 text-sm mb-7">Masuk untuk mengakses Layanan ANSA Finance</p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">ID Pengguna</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-green-500" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-[#F9FAFB] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm font-medium"
                    placeholder="Masukkan ID Pengguna"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-green-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-[#F9FAFB] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm font-medium"
                    placeholder="Masukkan Kata Sandi"
                    autoComplete="new-password"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Fake captcha/verification */}
              <div className="pt-2">
                <p className="text-[13px] font-semibold text-gray-700 mb-2">Verifikasi</p>
                <div className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <input type="checkbox" id="verify" className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" required />
                  <label htmlFor="verify" className="text-sm font-medium text-gray-700 select-none cursor-pointer">Terverifikasi</label>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <a href="#" className="text-[13px] text-gray-500 hover:text-primary transition-colors font-medium">Lupa Kata Sandi?</a>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#1A2C4D] hover:bg-[#111d33] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A2C4D] transition-all mt-6"
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
