
import React, { useEffect, useState } from 'react';
import { Home, Search, Wifi } from 'lucide-react';

interface LoadingScreenProps {
  status?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ status }) => {
  const [messageIdx, setMessageIdx] = useState(0);
  
  const messages = [
    "กำลังเชื่อมต่อระบบ...",
    "ค้นหาข้อมูลห้องพัก...",
    "กำลังเตรียมแบบฟอร์ม...",
    "ตรวจสอบสถานะการจอง..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 flex flex-col items-center justify-center p-6">
      
      {/* Animation Container */}
      <div className="relative mb-12">
        {/* Pulse Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-secondary/5 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
        
        {/* Center Icon */}
        <div className="relative z-10 w-24 h-24 bg-white rounded-3xl shadow-float flex items-center justify-center border border-white">
          <div className="relative">
            <Home className="text-primary w-10 h-10" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Floating elements */}
        <Search className="absolute -right-8 top-0 text-amber-400 w-6 h-6 animate-blob" />
        <Wifi className="absolute -left-6 bottom-0 text-indigo-300 w-5 h-5 animate-blob animation-delay-2000" />
      </div>

      {/* Text Content */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-800">Mama Mansion</h2>
        
        <div className="h-6 overflow-hidden relative">
          <p key={messageIdx} className="text-primary font-medium animate-in slide-in-from-bottom-2 fade-in duration-300">
             {status || messages[messageIdx]}
          </p>
        </div>
        
        <p className="text-xs text-gray-400 mt-4">Safe & Secure Check-out System</p>
      </div>

      {/* Progress Line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-secondary to-primary w-[50%] animate-[shimmer_2s_infinite_linear] translate-x-[-100%]"></div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
