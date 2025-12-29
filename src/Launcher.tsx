import React, { useState } from 'react';
import { Camera, Map, ChevronRight } from 'lucide-react';
import PhotoLoggerApp from './PhotoLoggerApp';
import MapEstimatorApp from './App'; 

type AppType = 'launcher' | 'photo-logger' | 'map-estimator';

const Launcher: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<AppType>('launcher');

  // 根據選擇渲染對應的子應用程式，並傳遞 onExit callback
  if (currentApp === 'photo-logger') {
    return <PhotoLoggerApp onExit={() => setCurrentApp('launcher')} />;
  }

  if (currentApp === 'map-estimator') {
    return <MapEstimatorApp onExit={() => setCurrentApp('launcher')} />;
  }

  // Launcher 主介面 - Apple Liquid Glass 風格
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      
      {/* 背景動態光暈特效 */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-200/40 blur-[100px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/40 blur-[120px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '10s' }}></div>

      <div className="w-full max-w-md relative z-10 space-y-8 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-700 tracking-wide mb-2 drop-shadow-sm">
            合煜消防
          </h1>
          <p className="text-lg text-slate-500 font-medium tracking-widest uppercase">應用程式總覽</p>
        </div>

        <div className="grid gap-6">
          {/* APP 1: 施工照片紀錄 */}
          <button
            onClick={() => setCurrentApp('photo-logger')}
            className="group relative flex items-center p-5 bg-white/60 backdrop-blur-2xl border border-white/60 hover:bg-white/80 rounded-3xl shadow-xl shadow-sky-100/60 transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="h-16 w-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Camera className="text-white" size={30} />
            </div>
            
            <div className="ml-5 text-left flex-1">
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-sky-700 transition-colors">施工照片紀錄</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">列表式拍照、浮水印輸出</p>
            </div>
            
            <div className="h-10 w-10 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors shadow-sm text-slate-400 group-hover:text-sky-600">
                <ChevronRight size={20} />
            </div>
          </button>

          {/* APP 2: 防火填塞估價 (橘紅色系) */}
          <button
            onClick={() => setCurrentApp('map-estimator')}
            className="group relative flex items-center p-5 bg-white/60 backdrop-blur-2xl border border-white/60 hover:bg-white/80 rounded-3xl shadow-xl shadow-sky-100/60 transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="h-16 w-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Map className="text-white" size={30} />
            </div>
            
            <div className="ml-5 text-left flex-1">
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-orange-700 transition-colors">防火填塞估價</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">匯入平面圖、點位標記</p>
            </div>
            
            <div className="h-10 w-10 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors shadow-sm text-slate-400 group-hover:text-orange-600">
                <ChevronRight size={20} />
            </div>
          </button>
        </div>
        
        <div className="text-center text-xs text-slate-400 mt-12 font-medium tracking-wide opacity-60">
          v2.1.0 Optimized Core
        </div>
      </div>
    </div>
  );
};

export default Launcher;