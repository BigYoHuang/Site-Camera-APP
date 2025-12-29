import React, { useRef, useState } from 'react';
import { X, ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { FloorPlan } from '../types';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newPlans: FloorPlan[]) => void;
  isPDFLoaded: boolean;
}

const AddPlanModal: React.FC<AddPlanModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isPDFLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPlans, setPendingPlans] = useState<FloorPlan[]>([]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files: File[] = Array.from(fileList);
    const newPlans: FloorPlan[] = [];
    setIsProcessing(true);

    try {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          if (!isPDFLoaded || !window.pdfjsLib) {
            alert('PDF 模組尚未載入，請稍後再試');
            continue;
          }

          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const scale = 2.0;
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                const blob = await new Promise<Blob | null>((resolve) =>
                  canvas.toBlob(resolve, 'image/jpeg', 0.9)
                );

                if (blob) {
                  const imgFile = new File([blob], `${file.name}_Page${i}.jpg`, { type: 'image/jpeg' });
                  newPlans.push({
                    id: Date.now() + Math.random(),
                    name: `${file.name.replace('.pdf', '')}_P${i}`,
                    file: imgFile,
                    src: URL.createObjectURL(imgFile),
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error parsing PDF:', err);
            alert(`無法讀取 PDF 檔案: ${file.name}`);
          }
        } else if (file.type.startsWith('image/')) {
          newPlans.push({
            id: Date.now() + Math.random(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            file: file,
            src: URL.createObjectURL(file),
          });
        }
      }

      setPendingPlans((prev) => [...prev, ...newPlans]);
    } catch (e) {
      console.error(e);
      alert('檔案處理發生錯誤');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleRemovePending = (idx: number) => {
    setPendingPlans((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNameChange = (idx: number, name: string) => {
    setPendingPlans((prev) => {
      const updated = [...prev];
      updated[idx].name = name;
      return updated;
    });
  };

  const handleConfirm = () => {
    if (pendingPlans.length === 0) return;
    onConfirm(pendingPlans);
    setPendingPlans([]); 
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-white/50">
        
        <div className="p-5 border-b border-white/40 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-xl text-slate-800">新增平面圖</h3>
          <button onClick={onClose} className="p-2 bg-slate-100/50 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all group ${
              isProcessing
                ? 'border-slate-200 bg-slate-50/50 cursor-wait'
                : 'border-blue-200/50 hover:bg-blue-50/50 hover:border-blue-300/50 bg-white/30'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center py-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-sm text-slate-500 font-bold">正在處理檔案...</span>
              </div>
            ) : (
              <>
                <div className="bg-white/70 p-3.5 rounded-full mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <span className="text-sm font-bold text-slate-600">點擊上傳 JPG/PNG/PDF</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {pendingPlans.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wide">準備匯入 ({pendingPlans.length})</h4>
              {pendingPlans.map((plan, idx) => (
                <div key={plan.id} className="flex items-center bg-white/60 border border-white/60 p-3 rounded-2xl shadow-sm">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 mr-3 border border-white/50">
                    <img src={plan.src} className="w-full h-full object-cover" alt="preview" />
                  </div>
                  <div className="flex-1">
                    <input
                      value={plan.name}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      className="w-full text-sm font-bold text-slate-800 border-b border-transparent focus:border-blue-500 outline-none bg-transparent placeholder:font-normal"
                      placeholder="輸入圖說名稱"
                    />
                  </div>
                  <button onClick={() => handleRemovePending(idx)} className="text-slate-400 hover:text-red-500 p-2.5 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/40 bg-white/50 rounded-b-[2rem] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={pendingPlans.length === 0 || isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={20} />
            確認新增
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlanModal;