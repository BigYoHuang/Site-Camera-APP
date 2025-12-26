import React, { useState, useEffect } from 'react';
import { Plus, Save, LogOut, FileDown, FolderOpen, FilePlus } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { ProjectData, ViewState, RecordItem } from './types';
import { loadProjectFromDB, saveProjectToDB, clearProjectFromDB } from './utils/db';
import { generateWatermark, formatLocationString } from './utils/watermark';
import RecordEditor from './components/RecordEditor';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordItem | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog States
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMonth, setNewProjectMonth] = useState('');

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const saved = await loadProjectFromDB();
        if (saved) {
          setProject(saved);
          setView(ViewState.PROJECT_LIST);
        }
      } catch (e) {
        console.error("Failed to load project", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Auto Save
  useEffect(() => {
    if (project) {
      saveProjectToDB(project).catch(err => console.error("Auto save failed", err));
    }
  }, [project]);

  const handleCreateProject = () => {
    if (!newProjectName || !newProjectMonth) {
      alert("請填寫所有欄位");
      return;
    }
    if (!/^\d{6}$/.test(newProjectMonth)) {
      alert("請款月份格式錯誤，應為 YYYYMM");
      return;
    }

    const newProject: ProjectData = {
      name: newProjectName,
      month: newProjectMonth,
      records: [],
      lastModified: Date.now()
    };
    setProject(newProject);
    setView(ViewState.PROJECT_LIST);
    setShowNewProjectDialog(false);
    setNewProjectName('');
    setNewProjectMonth('');
  };

  const handleOpenProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ProjectData;
        if (data.name && data.records) {
           await saveProjectToDB(data);
           setProject(data);
           setView(ViewState.PROJECT_LIST);
        } else {
          alert("無效的專案檔案");
        }
      } catch (err) {
        alert("讀取檔案失敗");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleExportJSON = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_${project.month}_專案備份.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
    if (!project) return;
    setIsLoading(true);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${project.name}_${project.month}`);
      
      const spreadsheetData: any[] = [];

      for (let i = 0; i < project.records.length; i++) {
        const rec = project.records[i];
        const displayId = (i + 1).toString().padStart(3, '0');
        const fileName = `${displayId}_${rec.workItem}.jpg`;
        
        const watermarkedDataUrl = await generateWatermark(rec.originalImage, rec, project.name);
        
        const imgData = watermarkedDataUrl.split(',')[1];
        folder?.file(fileName, imgData, { base64: true });

        spreadsheetData.push({
          '編號': displayId,
          '案場名稱': project.name,
          '請款月份': project.month,
          '施工位置': formatLocationString(rec.location),
          '施工項目': rec.workItem === '其他' ? (rec.workItemCustom || '') : rec.workItem,
          '施工日期': rec.date,
          '備註': rec.note
        });
      }

      const ws = XLSX.utils.json_to_sheet(spreadsheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工紀錄");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      folder?.file("施工統計表.xlsx", excelBuffer);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_${project.month}_匯出.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error(e);
      alert("匯出失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExit = async (save: boolean) => {
    if (save) {
      handleExportJSON();
    }
    await clearProjectFromDB();
    setProject(null);
    setView(ViewState.HOME);
    setShowExitDialog(false);
  };

  const saveRecord = (record: RecordItem) => {
    if (!project) return;
    
    let newRecords = [...project.records];
    const existingIndex = newRecords.findIndex(r => r.id === record.id);
    
    if (existingIndex >= 0) {
      newRecords[existingIndex] = record;
    } else {
      newRecords.push(record);
    }
    
    setProject({ ...project, records: newRecords, lastModified: Date.now() });
    setView(ViewState.PROJECT_LIST);
    setEditingRecord(undefined);
  };

  // --- Views ---

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
         <div className="bg-white/30 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/50">
            <div className="text-xl font-bold text-slate-700 animate-pulse">處理中...</div>
         </div>
      </div>
    );
  }

  // 1. Home View (Glassmorphism)
  if (view === ViewState.HOME) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 flex flex-col items-center">
          {/* Logo / Title */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 to-blue-700 tracking-wide mb-2 drop-shadow-sm">
              施工照片記錄
            </h1>
            <p className="text-lg text-slate-600 font-medium tracking-widest uppercase">合煜消防</p>
          </div>

          <div className="w-full space-y-5">
            <label className="block w-full group cursor-pointer">
               <div className="w-full bg-white/50 hover:bg-white/70 border border-white/60 rounded-2xl p-5 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm transition-all duration-300 group-active:scale-[0.98]">
                 <FolderOpen className="mr-3 text-cyan-600" />
                 開啟舊專案
               </div>
               <input type="file" accept=".json" onChange={handleOpenProject} className="hidden" />
            </label>

            <button 
              onClick={() => setShowNewProjectDialog(true)}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl p-5 flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/30 transition-all duration-300 active:scale-[0.98]"
            >
              <FilePlus className="mr-3" />
              建立新專案
            </button>
          </div>
        </div>

        {/* New Project Dialog (Glass Modal) */}
        {showNewProjectDialog && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl w-11/12 max-w-md shadow-2xl border border-white/60 animate-slideUp">
              <h3 className="text-xl font-bold mb-6 text-slate-800 text-center">建立新專案</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">案場名稱</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/50 border border-white/60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/50 rounded-xl p-3 outline-none transition-all placeholder:text-slate-400"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="例如：理仁柏舍"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">請款月份 (YYYYMM)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/50 border border-white/60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/50 rounded-xl p-3 outline-none transition-all placeholder:text-slate-400"
                    value={newProjectMonth}
                    onChange={e => setNewProjectMonth(e.target.value)}
                    placeholder="例如：202512"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={() => setShowNewProjectDialog(false)} 
                  className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100/50 font-medium transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleCreateProject} 
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all"
                >
                  建立
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Project List View (Glassmorphism)
  if (view === ViewState.PROJECT_LIST && project) {
    return (
      <div className="h-screen flex flex-col overflow-hidden relative animate-fadeIn">
        {/* Header - Transparent Glass */}
        <div className="bg-white/60 backdrop-blur-md border-b border-white/40 pt-safe-top pb-3 px-4 flex justify-between items-center shrink-0 z-10 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 truncate max-w-[50%] bg-white/40 px-3 py-1 rounded-lg border border-white/50">
            {project.name} <span className="text-slate-400 text-sm">|</span> {project.month}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handleExportJSON}
              className="p-2.5 rounded-full bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 border border-emerald-200/50 backdrop-blur-sm transition-all"
              title="儲存專案"
            >
              <Save size={20} />
            </button>
            <button 
              onClick={handleExportZip}
              className="p-2.5 rounded-full bg-blue-100/50 text-blue-700 hover:bg-blue-200/50 border border-blue-200/50 backdrop-blur-sm transition-all"
              title="匯出"
            >
               <FileDown size={20} />
            </button>
            <button 
              onClick={() => setShowExitDialog(true)}
              className="p-2.5 rounded-full bg-rose-100/50 text-rose-700 hover:bg-rose-200/50 border border-rose-200/50 backdrop-blur-sm transition-all"
              title="退出"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
          {project.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
               <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center mb-4">
                 <CameraOffIcon />
               </div>
              <p className="text-lg font-medium">尚無紀錄</p>
              <p className="text-sm">點擊右下角按鈕新增照片</p>
            </div>
          ) : (
            project.records.map((record, index) => (
              <div 
                key={record.id}
                onClick={() => { setEditingRecord(record); setView(ViewState.EDIT_RECORD); }}
                className="group bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-3 flex gap-4 items-center shadow-sm hover:shadow-md hover:bg-white/80 transition-all active:scale-[0.99] cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="h-20 w-20 bg-slate-100 shrink-0 rounded-xl overflow-hidden shadow-inner border border-white/50 relative">
                  <img src={record.originalImage} alt="thumbnail" className="h-full w-full object-cover" />
                  <div className="absolute top-0 left-0 bg-black/40 px-1.5 py-0.5 rounded-br-lg text-[10px] text-white font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
                {/* Info */}
                <div className="flex flex-col justify-center h-full min-w-0">
                  <span className="font-bold text-slate-800 text-lg truncate mb-1">
                    {formatLocationString(record.location)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cyan-700 bg-cyan-50/50 px-2 py-0.5 rounded-md border border-cyan-100/50 truncate">
                      {record.workItem === '其他' ? record.workItemCustom : record.workItem}
                    </span>
                  </div>
                   <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    {record.date}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAB */}
        <button 
          onClick={() => { setEditingRecord(undefined); setView(ViewState.EDIT_RECORD); }}
          className="absolute bottom-8 right-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full p-4 shadow-lg shadow-cyan-500/40 hover:scale-110 active:scale-95 transition-all z-20 border-4 border-white/30 backdrop-blur-sm"
        >
          <Plus size={32} strokeWidth={3} />
        </button>

        {/* Exit Dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/60 animate-slideUp">
              <h3 className="text-xl font-bold mb-4 text-slate-800 text-center">確認退出</h3>
              <p className="mb-6 text-slate-600 text-center text-sm leading-relaxed">您的專案狀態暫存於此裝置。若未下載JSON檔案，清除瀏覽器資料可能會導致紀錄遺失。</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleExit(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
                >
                  儲存並退出 (下載檔案)
                </button>
                <button 
                  onClick={() => handleExit(false)}
                  className="w-full py-3.5 bg-white/50 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl font-bold transition-colors"
                >
                  不儲存退出
                </button>
                <button 
                  onClick={() => setShowExitDialog(false)}
                  className="w-full py-3.5 text-slate-500 hover:text-slate-800 transition-colors text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Edit View (Full Screen Glass)
  if (view === ViewState.EDIT_RECORD) {
    return (
      <div className="h-screen w-full relative bg-white/30 backdrop-blur-xl animate-fadeIn">
        <RecordEditor 
          initialData={editingRecord}
          onSave={saveRecord}
          onCancel={() => setView(ViewState.PROJECT_LIST)}
          nextId={project ? project.records.length + 1 : 1}
        />
      </div>
    );
  }

  return null;
};

const CameraOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-off opacity-50"><line x1="2" x2="22" y1="2" y2="22"/><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/><path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"/><path d="M14.121 15.121A3 3 0 1 1 9.88 10.88"/></svg>
);

export default App;
