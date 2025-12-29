import React from 'react';
import { X, MousePointer2 } from 'lucide-react';
import { Marker } from '../types';

interface ClusterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: Marker[]; 
  onSelect: (marker: Marker) => void; 
}

const ClusterSelectModal: React.FC<ClusterSelectModalProps> = ({
  isOpen,
  onClose,
  markers,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-xs rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50">
        
        <div className="p-4 border-b border-white/40 bg-white/40 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-yellow-400 border border-red-600 w-7 h-7 flex items-center justify-center font-bold rounded-lg text-xs shadow-sm">
              {markers.length}
            </div>
            <h3 className="font-bold text-lg text-slate-800">選擇標記</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100/50 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2.5">
          {markers.map((marker) => (
            <button
              key={marker.id}
              onClick={() => onSelect(marker)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50/80 active:bg-blue-100/80 transition-colors border border-transparent hover:border-blue-100 shadow-sm bg-white/60 text-left group"
            >
              <div className="bg-yellow-400 border border-red-600 w-9 h-9 flex-shrink-0 flex items-center justify-center font-bold rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                {marker.seq}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate text-sm">
                   {marker.data.location || '無位置描述'}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {marker.data.floor}F {marker.data.isMezzanine ? '(夾層)' : ''} - {marker.data.surfaceType}
                </div>
              </div>
              <MousePointer2 className="text-slate-300 group-hover:text-blue-500 transition-colors" size={18} />
            </button>
          ))}
        </div>
        
        <div className="p-3 bg-slate-50/50 text-center text-xs text-slate-400 font-medium border-t border-white/40">
            請選擇要查看或編輯的項目
        </div>
      </div>
    </div>
  );
};

export default ClusterSelectModal;