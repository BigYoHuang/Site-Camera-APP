import React, { useState, useEffect } from 'react';
import { Plus, Save, LogOut, FileDown, FolderOpen, FilePlus } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { ProjectData, ViewState, RecordItem } from './types';
import { loadProjectFromDB, saveProjectToDB, clearProjectFromDB } from './utils/db';
import { generateWatermark, formatLocationString } from './utils/watermark';
import RecordEditor from './components/RecordEditor';

/**
 * App 主元件
 * 管理全域狀態：目前的視圖(View)、專案資料(Project)、對話框顯示狀態
 */
const App: React.FC = () => {
  // --- 狀態管理 ---
  const [view, setView] = useState<ViewState>(ViewState.HOME); // 當前畫面
  const [project, setProject] = useState<ProjectData | null>(null); // 當前專案資料
  const [editingRecord, setEditingRecord] = useState<RecordItem | undefined>(undefined); // 正被編輯的紀錄
  const [isLoading, setIsLoading] = useState(false); // 載入狀態
  
  // 對話框狀態
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  
  // 新專案輸入欄位
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMonth, setNewProjectMonth] = useState('');

  // --- Side Effects ---
  
  // 1. 初始化載入：檢查 IndexedDB 是否有未完成的專案
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const saved = await loadProjectFromDB();
        if (saved) {
          setProject(saved);
          setView(ViewState.PROJECT_LIST); // 若有存檔，直接進入列表
        }
      } catch (e) {
        console.error("Failed to load project", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // 2. 自動儲存：當 project 狀態改變時，寫入 IndexedDB
  useEffect(() => {
    if (project) {
      saveProjectToDB(project).catch(err => console.error("Auto save failed", err));
    }
  }, [project]);

  // --- 事件處理函式 ---

  /**
   * 建立新專案
   * 驗證輸入並初始化專案結構
   */
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

  /**
   * 開啟舊專案 (讀取 JSON 檔案)
   */
  const handleOpenProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ProjectData;
        if (data.name && data.records) {
           await saveProjectToDB(data); // 立即寫入 DB
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
    e.target.value = ''; // 重置 input 以便重複選擇同檔名
  };

  /**
   * 匯出專案備份 (JSON)
   */
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

  /**
   * 匯出 ZIP 包
   * 包含：1. 加浮水印的照片 2. Excel 統計表
   */
  const handleExportZip = async () => {
    if (!project) return;
    setIsLoading(true);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${project.name}_${project.month}`);
      
      const spreadsheetData: any[] = [];

      // 遍歷所有紀錄
      for (let i = 0; i < project.records.length; i++) {
        const rec = project.records[i];
        const displayId = (i + 1).toString().padStart(3, '0'); // 格式化編號 001, 002...
        const fileName = `${displayId}_${rec.workItem}.jpg`;
        
        // 核心邏輯：即時生成浮水印圖片
        const watermarkedDataUrl = await generateWatermark(rec.originalImage, rec, project.name);
        
        // 將圖片加入 ZIP (需移除 DataURL 前綴)
        const imgData = watermarkedDataUrl.split(',')[1];
        folder?.file(fileName, imgData, { base64: true });

        // 準備 Excel 資料列
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

      // 生成 Excel 檔案
      const ws = XLSX.utils.json_to_sheet(spreadsheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工紀錄");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      folder?.file("施工統計表.xlsx", excelBuffer);

      // 打包並下載 ZIP
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

  /**
   * 退出專案
   * @param save 是否在退出前下載 JSON
   */
  const handleExit = async (save: boolean) => {
    if (save) {
      handleExportJSON();
    }
    await clearProjectFromDB(); // 清除本地快取
    setProject(null);
    setView(ViewState.HOME);
    setShowExitDialog(false);
  };

  /**
   * 儲存單筆紀錄 (新增或修改)
   */
  const saveRecord = (record: RecordItem) => {
    if (!project) return;
    
    let newRecords = [...project.records];
    const existingIndex = newRecords.findIndex(r => r.id === record.id);
    
    if (existingIndex >= 0) {
      // 修改現有紀錄
      newRecords[existingIndex] = record;
    } else {
      // 新增紀錄
      newRecords.push(record);
    }
    
    // 更新狀態觸發 Auto Save
    setProject({ ...project, records: newRecords, lastModified: Date.now() });
    setView(ViewState.PROJECT_LIST);
    setEditingRecord(undefined);
  };

  // --- Render 邏輯 ---

  // 0. 載入畫面
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
         <div className="bg-white/30 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/50">
            <div className="text-xl font-bold text-slate-700 animate-pulse">處理中...</div>
         </div>
      </div>
    );
  }

  // 1. 首頁 (ViewState.HOME)
  // 風格：置中卡片，毛玻璃背景
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
            {/* 開啟舊專案按鈕 */}
            <label className="block w-full group cursor-pointer">
               <div className="w-full bg-white/50 hover:bg-white/70 border border-white/60 rounded-2xl p-5 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm transition-all duration-300 group-active:scale-[0.98]">
                 <FolderOpen className="mr-3 text-cyan-600" />
                 開啟舊專案
               </div>
               <input type="file" accept=".json" onChange={handleOpenProject} className="hidden" />
            </label>

            {/* 建立新專案按鈕 */}
            <button 
              onClick={() => setShowNewProjectDialog(true)}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl p-5 flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/30 transition-all duration-300 active:scale-[0.98]"
            >
              <FilePlus className="mr-3" />
              建立新專案
            </button>
          </div>
        </div>

        {/* 建立新專案對話框 (Modal) */}
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
                    placeholder=" "
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

  // 2. 專案列表頁 (ViewState.PROJECT_LIST)
  if (view === ViewState.PROJECT_LIST && project) {
    return (
      <div className="h-screen flex flex-col overflow-hidden relative animate-fadeIn">
        {/* Header - 透明毛玻璃頂部欄 */}
        <div className="bg-white/60 backdrop-blur-md border-b border-white/40 pt-safe-top pb-3 px-4 flex justify-between items-center shrink-0 z-10 shadow-sm">
          {/* 修改：案場名稱與月份改為上下兩行顯示，背景更通透 */}
          <div className="flex flex-col max-w-[60%] bg-white/40 px-4 py-1.5 rounded-xl border border-white/50 backdrop-blur-sm shadow-sm">
            <h2 className="text-base font-bold text-slate-800 truncate leading-tight">
              {project.name}
            </h2>
            <span className="text-xs text-slate-500 font-medium tracking-wider">
              {project.month}
            </span>
          </div>
          
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

        {/* 紀錄列表區域 */}
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
                {/* 縮圖 */}
                <div className="h-20 w-20 bg-slate-100 shrink-0 rounded-xl overflow-hidden shadow-inner border border-white/50 relative">
                  <img src={record.originalImage} alt="thumbnail" className="h-full w-full object-cover" />
                  <div className="absolute top-0 left-0 bg-black/40 px-1.5 py-0.5 rounded-br-lg text-[10px] text-white font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
                {/* 資訊文字 */}
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

        {/* 浮動新增按鈕 (FAB) - Apple Liquid Glass Style */}
        <button 
          onClick={() => { setEditingRecord(undefined); setView(ViewState.EDIT_RECORD); }}
          className="absolute bottom-8 right-6 w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/70 to-blue-600/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all z-20 text-white"
        >
           {/* 內部光暈效果 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
          <Plus size={32} strokeWidth={3} className="drop-shadow-md" />
        </button>

        {/* 退出確認對話框 */}
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

  // 3. 編輯/新增紀錄頁面 (全螢幕模式)
  if (view === ViewState.EDIT_RECORD) {
    return (
      <div className="h-screen w-full relative bg-white/30 backdrop-blur-xl animate-fadeIn">
        <RecordEditor 
          initialData={editingRecord}
          lastRecord={project?.records[project.records.length - 1]} // 傳入上一筆紀錄
          onSave={saveRecord}
          onCancel={() => setView(ViewState.PROJECT_LIST)}
          nextId={project ? project.records.length + 1 : 1}
        />
      </div>
    );
  }

  return null;
};

// 輔助圖示元件
const CameraOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-off opacity-50"><line x1="2" x2="22" y1="2" y2="22"/><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/><path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"/><path d="M14.121 15.121A3 3 0 1 1 9.88 10.88"/></svg>
);

export default App;