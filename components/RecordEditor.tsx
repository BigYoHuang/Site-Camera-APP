import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, X, ChevronDown } from 'lucide-react';
import { RecordItem, LocationData, WORK_ITEMS } from '../types';
import { formatLocationString } from '../utils/watermark';

interface Props {
  initialData?: RecordItem;
  onSave: (record: RecordItem) => void;
  onCancel: () => void;
  nextId: number;
}

const RecordEditor: React.FC<Props> = ({ initialData, onSave, onCancel, nextId }) => {
  const [image, setImage] = useState<string | null>(initialData?.originalImage || null);
  const [location, setLocation] = useState<LocationData>(initialData?.location || {
    building: '',
    floorStart: '',
    floorEnd: '',
    details: ''
  });
  const [workItem, setWorkItem] = useState<string>(initialData?.workItem || WORK_ITEMS[0]);
  const [workItemCustom, setWorkItemCustom] = useState<string>(initialData?.workItemCustom || '');
  const [date, setDate] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>(initialData?.note || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!image) {
      alert('請先拍攝照片');
      return;
    }

    const newRecord: RecordItem = {
      id: initialData?.id || Date.now().toString(),
      timestamp: initialData?.timestamp || Date.now(),
      originalImage: image,
      location,
      workItem,
      workItemCustom: workItem === '其他' ? workItemCustom : undefined,
      date,
      note
    };
    onSave(newRecord);
  };

  const isEditing = !!initialData;
  const title = isEditing ? '編輯紀錄' : '新增紀錄';

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-2xl z-50 overflow-y-auto flex flex-col animate-slideUp">
      {/* Header */}
      <div className="bg-white/50 backdrop-blur-md border-b border-white/50 px-4 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onCancel} className="p-2 bg-slate-100/50 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-6 pb-24 max-w-lg mx-auto w-full">
        
        {/* Photo Section */}
        <div 
          className="w-full aspect-[4/3] bg-white/40 rounded-3xl border-2 border-dashed border-slate-300/60 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer active:bg-white/60 transition-all shadow-inner group hover:border-cyan-400/50"
          onClick={() => fileInputRef.current?.click()}
        >
          {image ? (
            <img src={image} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-slate-400 group-hover:text-cyan-600 transition-colors">
              <div className="bg-white/60 p-4 rounded-full mb-3 inline-block shadow-sm">
                 <Camera size={40} className="opacity-80" />
              </div>
              <span className="text-lg font-medium block">點擊以拍照</span>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>

        {/* Location Section */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 ml-1">施工位置</label>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-white/50 rounded-xl p-1 border border-white/60 shadow-sm focus-within:ring-2 focus-within:ring-cyan-200/50">
                    <input 
                      type="text" 
                      value={location.building}
                      onChange={(e) => setLocation({...location, building: e.target.value})}
                      className="w-16 p-2 bg-transparent text-center outline-none font-bold text-slate-800" 
                      placeholder="-" 
                    />
                    <span className="pr-3 text-slate-500 text-sm font-medium">棟</span>
                </div>
                <div className="flex items-center bg-white/50 rounded-xl p-1 border border-white/60 shadow-sm focus-within:ring-2 focus-within:ring-cyan-200/50">
                    <input 
                      type="number" 
                      value={location.floorStart}
                      onChange={(e) => setLocation({...location, floorStart: e.target.value})}
                      className="w-14 p-2 bg-transparent text-center outline-none font-bold text-slate-800" 
                      placeholder="-" 
                    />
                    <span className="text-slate-500 text-sm">F</span>
                    <span className="mx-1 text-slate-400">~</span>
                    <input 
                      type="number" 
                      value={location.floorEnd}
                      onChange={(e) => setLocation({...location, floorEnd: e.target.value})}
                      className="w-14 p-2 bg-transparent text-center outline-none font-bold text-slate-800" 
                      placeholder="-" 
                    />
                    <span className="pr-2 text-slate-500 text-sm">F</span>
                </div>
            </div>
             <input 
                  type="text" 
                  value={location.details}
                  onChange={(e) => setLocation({...location, details: e.target.value})}
                  className="w-full mt-2 p-3 bg-white/50 border border-white/60 rounded-xl outline-none focus:ring-2 focus:ring-cyan-200/50 shadow-sm transition-all" 
                  placeholder="輸入詳細位置..." 
                />
            <p className="text-xs text-slate-400 ml-1">預覽: {formatLocationString(location) || '(未填寫)'}</p>
        </div>

        {/* Work Item Section */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 ml-1">施工項目</label>
            <div className="relative">
              <select 
                value={workItem} 
                onChange={(e) => setWorkItem(e.target.value)}
                className="w-full p-4 pr-10 border border-white/60 rounded-xl bg-white/50 appearance-none outline-none focus:ring-2 focus:ring-cyan-200/50 shadow-sm text-slate-800 font-medium transition-all"
              >
                {WORK_ITEMS.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
            </div>
            {workItem === '其他' && (
               <input 
               type="text" 
               value={workItemCustom}
               onChange={(e) => setWorkItemCustom(e.target.value)}
               className="w-full p-4 border border-white/60 rounded-xl bg-white/50 mt-2 outline-none focus:ring-2 focus:ring-cyan-200/50 shadow-sm transition-all animate-fadeIn" 
               placeholder="請輸入其他施工項目" 
             />
            )}
        </div>

        {/* Date Section */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 ml-1">施工日期</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 border border-white/60 rounded-xl bg-white/50 outline-none focus:ring-2 focus:ring-cyan-200/50 shadow-sm text-slate-800 font-medium" 
            />
        </div>

        {/* Note Section */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 ml-1">備註</label>
            <textarea 
               value={note}
               onChange={(e) => setNote(e.target.value)}
               className="w-full p-4 border border-white/60 rounded-xl bg-white/50 outline-none focus:ring-2 focus:ring-cyan-200/50 shadow-sm transition-all" 
               placeholder="輸入備註事項..."
               rows={3}
             />
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl text-lg mt-6 shadow-lg shadow-cyan-500/30 active:scale-[0.98] transition-all"
        >
          儲存紀錄
        </button>

      </div>
    </div>
  );
};

export default RecordEditor;
