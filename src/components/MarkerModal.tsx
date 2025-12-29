import React, { useRef } from 'react';
import { X, Camera, Check } from 'lucide-react';
import { Marker, MarkerData } from '../types';

interface MarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarker: Partial<Marker> | null;
  formData: MarkerData;
  setFormData: React.Dispatch<React.SetStateAction<MarkerData>>;
  onSave: () => void;
  onPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  FLOOR_OPTIONS: string[];
  NUMBER_OPTIONS: number[];
  isEditing?: boolean;
}

const MarkerModal: React.FC<MarkerModalProps> = ({
  isOpen,
  onClose,
  activeMarker,
  formData,
  setFormData,
  onSave,
  onPhotoCapture,
  FLOOR_OPTIONS,
  NUMBER_OPTIONS,
  isEditing = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const PIPES = [1, 2, 3, 4, 6];

  const toggleIncomplete = () => {
    setFormData((prev) => ({
      ...prev,
      isIncomplete: !prev.isIncomplete,
      noFireBarrier: !prev.isIncomplete ? false : prev.noFireBarrier,
    }));
  };

  const toggleNoFireBarrier = () => {
    setFormData((prev) => ({
      ...prev,
      noFireBarrier: !prev.noFireBarrier,
      isIncomplete: !prev.noFireBarrier ? false : prev.isIncomplete,
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/80 backdrop-blur-2xl w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl border border-white/50 animate-slideUp">
        <div className="p-5 border-b border-white/40 flex justify-between items-center sticky top-0 bg-white/60 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 border border-red-600 w-9 h-9 flex items-center justify-center font-bold rounded-lg text-sm shadow-sm">
              {activeMarker?.seq}
            </div>
            <h3 className="font-bold text-xl text-slate-800">{isEditing ? '編輯紀錄' : '新增紀錄'}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100/50 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div
            onClick={() => cameraInputRef.current?.click()}
            className={`w-full h-40 rounded-3xl flex items-center justify-center cursor-pointer border-2 transition-all shadow-sm group ${
              formData.tempImage
                ? 'border-emerald-500/30 bg-emerald-50/40'
                : 'border-dashed border-slate-300 bg-white/40 hover:bg-white/60 hover:border-blue-400/50'
            }`}
          >
            {formData.tempImage ? (
              <div className="relative w-full h-full p-1.5">
                <img
                  src={URL.createObjectURL(formData.tempImage)}
                  className="w-full h-full object-contain rounded-2xl shadow-sm"
                  alt="Captured"
                />
                <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold shadow-lg">
                  <Check size={14} strokeWidth={3} /> 已拍攝
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-slate-500 transition-colors">
                <div className="bg-white/80 p-3.5 rounded-full shadow-sm">
                  <Camera size={28} className="text-blue-500" />
                </div>
                <span className="font-bold text-sm">點擊開啟相機</span>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhotoCapture}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div>
              <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">樓層</label>
              <select
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full border-white/60 border p-4 rounded-2xl bg-white/50 focus:ring-2 focus:ring-blue-200/50 outline-none font-bold text-slate-700 shadow-sm appearance-none"
              >
                {FLOOR_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}F
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">夾層</label>
              <button
                onClick={() => setFormData((prev) => ({ ...prev, isMezzanine: !prev.isMezzanine }))}
                className={`h-[58px] px-6 rounded-2xl border font-bold transition-all shadow-sm ${
                  formData.isMezzanine
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-slate-500 border-white/60 bg-white/50 hover:bg-white/80'
                }`}
              >
                {formData.isMezzanine ? '是 (M)' : '否'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">位置描述</label>
            <input
              type="text"
              placeholder="例如：主臥廁所"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border-white/60 border p-4 rounded-2xl bg-white/50 focus:ring-2 focus:ring-blue-200/50 outline-none shadow-sm placeholder:text-slate-400 text-slate-800 font-medium"
            />
          </div>

          <div className="space-y-2.5">
            <span className="text-xs text-slate-500 font-bold block ml-1">金屬管</span>
            <div className="grid grid-cols-5 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-white/60 shadow-inner">
              {PIPES.map((num) => (
                <div key={`metal-${num}`}>
                  <label className="text-[10px] text-center text-slate-400 font-bold block mb-1">{num}"</label>
                  <select
                    value={(formData as any)[`metal${num}`]}
                    onChange={(e) => setFormData({ ...formData, [`metal${num}`]: e.target.value })}
                    className="w-full border-slate-200 border p-1.5 rounded-xl bg-white text-sm text-center focus:border-blue-400 outline-none font-bold text-slate-700 shadow-sm"
                  >
                    {NUMBER_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs text-slate-500 font-bold block ml-1">PVC管</span>
            <div className="grid grid-cols-5 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-white/60 shadow-inner">
              {PIPES.map((num) => (
                <div key={`pvc-${num}`}>
                  <label className="text-[10px] text-center text-slate-400 font-bold block mb-1">{num}"</label>
                  <select
                    value={(formData as any)[`pvc${num}`]}
                    onChange={(e) => setFormData({ ...formData, [`pvc${num}`]: e.target.value })}
                    className="w-full border-slate-200 border p-1.5 rounded-xl bg-white text-sm text-center focus:border-blue-400 outline-none font-bold text-slate-700 shadow-sm"
                  >
                    {NUMBER_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">長</label>
              <input
                type="number"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                className="w-full border-white/60 border p-4 rounded-2xl bg-white/50 focus:ring-2 focus:ring-blue-200/50 outline-none shadow-sm font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">寬</label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                className="w-full border-white/60 border p-4 rounded-2xl bg-white/50 focus:ring-2 focus:ring-blue-200/50 outline-none shadow-sm font-bold text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold block mb-2 ml-1">施作面</label>
            <div className="grid grid-cols-4 gap-2">
              {['單面', '雙面', '腳踩面', '倒吊面'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, surfaceType: type })}
                  className={`py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border shadow-sm ${
                    formData.surfaceType === type
                      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'
                      : 'bg-white/50 text-slate-500 border-white/60 hover:bg-white/80'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <button
              onClick={toggleIncomplete}
              className={`py-4 rounded-2xl font-bold text-sm transition-all border shadow-sm ${
                formData.isIncomplete
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'
                  : 'bg-white/50 text-slate-500 border-white/60 hover:bg-white/80'
              }`}
            >
              不完整
            </button>
            <button
              onClick={toggleNoFireBarrier}
              className={`py-4 rounded-2xl font-bold text-sm transition-all border shadow-sm ${
                formData.noFireBarrier
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'
                  : 'bg-white/50 text-slate-500 border-white/60 hover:bg-white/80'
              }`}
            >
              無防火帶
            </button>
          </div>

          <div className="pt-2 pb-8">
            <button
              onClick={onSave}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all"
            >
              儲存並返回地圖
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkerModal;