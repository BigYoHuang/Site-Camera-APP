import React, { useState } from 'react';
import { Camera, Map, ChevronRight } from 'lucide-react';
import PhotoLoggerApp from './PhotoLoggerApp';
import MapEstimatorApp from './App'; // 原本的 App.tsx 是工地現場紀錄 (Map Estimator)

type AppType = 'launcher' | 'photo-logger' | 'map-estimator';

const Launcher: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<AppType>('launcher');

  // 如果選擇了特定 APP，則渲染該 APP，並傳入退出函式
  if (currentApp === 'photo-logger') {
    return <PhotoLoggerApp onExit={() => setCurrentApp('launcher')} />;
  }

  if (currentApp === 'map-estimator') {
    return <MapEstimatorApp onExit={() => setCurrentApp('launcher')} />;
  }

  // Launcher 主介面
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">合煜消防</h1>
          <p className="text-slate-400">應用程式總覽</p>
        </div>

        <div className="grid gap-4">
          {/* APP 1: 施工照片紀錄 */}
          <button
            onClick={() => setCurrentApp('photo-logger')}
            className="group relative flex items-center p-5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="h-14 w-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Camera className="text-white" size={28} />
            </div>
            <div className="ml-5 text-left flex-1">
              <h3 className="text-lg font-bold text-white">施工照片紀錄</h3>
              <p className="text-sm text-slate-400 mt-0.5">列表式拍照、浮水印輸出</p>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
          </button>

          {/* APP 2: 防火填塞圖面標記 */}
          <button
            onClick={() => setCurrentApp('map-estimator')}
            className="group relative flex items-center p-5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="h-14 w-14 bg-gradient-to-br from-orange-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Map className="text-white" size={28} />
            </div>
            <div className="ml-5 text-left flex-1">
              <h3 className="text-lg font-bold text-white">圖面標記估價</h3>
              <p className="text-sm text-slate-400 mt-0.5">匯入平面圖、點位標記</p>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </div>
        
        <div className="text-center text-xs text-slate-600 mt-12">
          v2.0.1 Integrated System
        </div>
      </div>
    </div>
  );
};

export default Launcher;