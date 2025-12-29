import React, { useRef, useState } from 'react';
import { ImageIcon, X, FolderOpen, Loader2, ArrowLeft } from 'lucide-react';
import { ProjectInfo, FloorPlan } from '../types';

interface SetupScreenProps {
  projectInfo: ProjectInfo;
  setProjectInfo: React.Dispatch<React.SetStateAction<ProjectInfo>>;
  onFileUpload: (newPlans: FloorPlan[]) => void;
  onUpdatePlanName: (idx: number, name: string) => void;
  onRemovePlan: (idx: number) => void;
  onStart: () => void;
  onReset: () => void;
  onLoadProject: (file: File) => void;
  isZipLoaded: boolean;
  isPDFLoaded: boolean;
  onExit: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  projectInfo,
  setProjectInfo,
  onFileUpload,
  onUpdatePlanName,
  onRemovePlan,
  onStart,
  onReset,
  onLoadProject,
  isZipLoaded,
  isPDFLoaded,
  onExit
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
                await page.render({
                  canvasContext: context,
                  viewport: viewport,
                }).promise;

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

      if (newPlans.length > 0) {
        onFileUpload(newPlans);
      }

    } catch (e) {
      console.error(e);
      alert('檔案處理發生錯誤');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50">
      
      {/* 背景動態光暈特效 */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-200/30 blur-[80px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-red-200/30 blur-[100px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '10s' }}></div>

      <button onClick={onExit} className="absolute top-6 left-6 p-2 rounded-full bg-white/50 hover:bg-white/80 transition text-slate-600 shadow-sm z-50 backdrop-blur-sm">
           <ArrowLeft size={24} />
      </button>

      {/* 主卡片：Glassmorphism */}
      <div className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 space-y-6 relative z-10">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-700 mb-1 drop-shadow-sm">防火填塞估價</h1>
          <p className="text-slate-500 text-sm font-medium tracking-wide">建立新專案 或 開啟舊專案</p>
        </div>

        <div className="pb-4 border-b border-white/40">
          <button
            onClick={() => projectInputRef.current?.click()}
            disabled={!isZipLoaded}
            className="w-full flex items-center justify-center gap-2 bg-white/60 hover:bg-white/80 text-slate-700 py-3.5 rounded-2xl font-bold border border-white/50 shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <FolderOpen size={20} className="text-orange-500" />
            <span>開啟專案檔 (.siteproj)</span>
          </button>
          <input
            ref={projectInputRef}
            type="file"
            accept=".siteproj,.zip" 
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onLoadProject(file);
              e.target.value = '';
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">專案名稱 (新專案)</label>
          <input
            type="text"
            className="w-full bg-white/50 border border-white/60 p-3.5 rounded-2xl focus:ring-2 focus:ring-orange-200/50 outline-none transition-all placeholder:text-slate-400"
            placeholder="例如：XX建案_B棟"
            value={projectInfo.name}
            onChange={(e) => setProjectInfo({ ...projectInfo, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">匯入平面圖</label>
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group ${
               isProcessing 
                 ? 'border-slate-200 bg-slate-50/50 cursor-wait' 
                 : 'border-orange-200/50 hover:bg-orange-50/50 hover:border-orange-300/50 bg-white/30'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center py-2">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                <span className="text-sm text-slate-500 font-bold">正在處理檔案...</span>
              </div>
            ) : (
              <>
                <div className="bg-white/70 p-3.5 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <span className="text-sm font-bold text-slate-600">點擊上傳 JPG/PNG/PDF</span>
                <span className="text-xs text-slate-400 mt-1 font-medium">PDF將自動轉換為圖片</span>
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
        </div>

        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
          {projectInfo.floorPlans.map((plan, idx) => (
            <div key={plan.id} className="flex items-center bg-white/60 border border-white/60 p-2 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 mr-3 border border-white/50">
                <img src={plan.src} className="w-full h-full object-cover" alt="preview" />
              </div>
              <div className="flex-1">
                <input
                  value={plan.name}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onUpdatePlanName(idx, e.target.value)}
                  className="w-full text-sm font-bold text-slate-700 border-b border-transparent focus:border-orange-400 outline-none bg-transparent placeholder:font-normal"
                  placeholder="輸入圖說名稱"
                />
              </div>
              <button onClick={() => onRemovePlan(idx)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          disabled={!projectInfo.name || projectInfo.floorPlans.length === 0 || isProcessing}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          開始作業 / 儲存設定
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;