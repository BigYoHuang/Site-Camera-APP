import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col animate-slideUp">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-800">
          <X size={28} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-5 pb-20">
        
        {/* Photo Section */}
        <div 
          className="w-full aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer active:bg-gray-200 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {image ? (
            <img src={image} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-slate-500">
              <Camera size={48} className="mx-auto mb-2 opacity-50" />
              <span className="text-lg">點擊以拍照</span>
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
            <label className="block text-sm font-medium text-slate-700">施工位置</label>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center">
                    <input 
                      type="text" 
                      value={location.building}
                      onChange={(e) => setLocation({...location, building: e.target.value})}
                      className="w-16 p-2 border border-gray-300 rounded text-center" 
                      placeholder="" 
                    />
                    <span className="ml-1 text-slate-700">棟</span>
                </div>
                <div className="flex items-center">
                    <input 
                      type="number" 
                      value={location.floorStart}
                      onChange={(e) => setLocation({...location, floorStart: e.target.value})}
                      className="w-16 p-2 border border-gray-300 rounded text-center" 
                      placeholder="" 
                    />
                    <span className="mx-1 text-slate-700">F</span>
                    <span className="text-slate-700">~</span>
                    <input 
                      type="number" 
                      value={location.floorEnd}
                      onChange={(e) => setLocation({...location, floorEnd: e.target.value})}
                      className="w-16 p-2 border border-gray-300 rounded text-center ml-1" 
                      placeholder="" 
                    />
                    <span className="ml-1 text-slate-700">F</span>
                </div>
                <input 
                  type="text" 
                  value={location.details}
                  onChange={(e) => setLocation({...location, details: e.target.value})}
                  className="flex-1 min-w-[120px] p-2 border border-gray-300 rounded" 
                  placeholder="詳細位置" 
                />
            </div>
            <p className="text-xs text-slate-500">預覽: {formatLocationString(location) || '(未填寫)'}</p>
        </div>

        {/* Work Item Section */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">施工項目</label>
            <select 
              value={workItem} 
              onChange={(e) => setWorkItem(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-white"
            >
              {WORK_ITEMS.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            {workItem === '其他' && (
               <input 
               type="text" 
               value={workItemCustom}
               onChange={(e) => setWorkItemCustom(e.target.value)}
               className="w-full p-3 border border-gray-300 rounded mt-2" 
               placeholder="請輸入其他施工項目" 
             />
            )}
        </div>

        {/* Date Section */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">施工日期</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-white" 
            />
        </div>

        {/* Note Section */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">備註</label>
            <textarea 
               value={note}
               onChange={(e) => setNote(e.target.value)}
               className="w-full p-3 border border-gray-300 rounded" 
               placeholder="輸入備註..."
               rows={3}
             />
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          className="w-full bg-sky-200 hover:bg-sky-300 text-slate-900 border border-slate-300 font-bold py-4 px-6 rounded-lg text-lg mt-4 shadow-sm"
        >
          儲存
        </button>

      </div>
    </div>
  );
};

export default RecordEditor;
