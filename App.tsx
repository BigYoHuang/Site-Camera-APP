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
    // Simple validation for YYYYMM
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
           await saveProjectToDB(data); // Save immediately to IDB
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
    e.target.value = ''; // reset
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

      // Process Images & Metadata
      for (let i = 0; i < project.records.length; i++) {
        const rec = project.records[i];
        const displayId = (i + 1).toString().padStart(3, '0');
        const fileName = `${displayId}_${rec.workItem}.jpg`;
        
        // Generate Watermark
        const watermarkedDataUrl = await generateWatermark(rec.originalImage, rec, project.name);
        
        // Add to Zip (remove data:image/jpeg;base64, prefix)
        const imgData = watermarkedDataUrl.split(',')[1];
        folder?.file(fileName, imgData, { base64: true });

        // Add to Excel Row
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

      // Generate Excel
      const ws = XLSX.utils.json_to_sheet(spreadsheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工紀錄");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      folder?.file("施工統計表.xlsx", excelBuffer);

      // Download Zip
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
    return <div className="h-screen flex items-center justify-center text-xl font-bold text-primary">載入中...</div>;
  }

  // 1. Home View
  if (view === ViewState.HOME) {
    return (
      <div className="h-screen p-6 flex flex-col items-center justify-center bg-white border-[6px] border-secondary rounded-xl m-2">
        <h1 className="text-4xl font-bold mb-2 text-slate-900 tracking-wider">施工照片記錄</h1>
        <p className="text-xl text-slate-500 mb-12">合煜消防</p>

        <div className="w-full max-w-sm space-y-6">
          <label className="block w-full">
             <div className="w-full border-2 border-secondary rounded-lg p-6 flex items-center justify-center text-xl font-bold text-slate-800 cursor-pointer active:bg-slate-100 shadow-sm transition-transform active:scale-95">
               <FolderOpen className="mr-3" />
               開啟舊專案
             </div>
             <input type="file" accept=".json" onChange={handleOpenProject} className="hidden" />
          </label>

          <button 
            onClick={() => setShowNewProjectDialog(true)}
            className="w-full border-2 border-secondary rounded-lg p-6 flex items-center justify-center text-xl font-bold text-slate-800 active:bg-slate-100 shadow-sm transition-transform active:scale-95"
          >
            <FilePlus className="mr-3" />
            建立新專案
          </button>
        </div>

        {/* New Project Dialog */}
        {showNewProjectDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-11/12 max-w-md shadow-xl">
              <h3 className="text-xl font-bold mb-4">建立新專案</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">案場名稱</label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="例如：理仁柏舍"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">請款月份 (YYYYMM)</label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded"
                    value={newProjectMonth}
                    onChange={e => setNewProjectMonth(e.target.value)}
                    placeholder="例如：202512"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowNewProjectDialog(false)} className="px-4 py-2 text-slate-600">取消</button>
                <button onClick={handleCreateProject} className="px-4 py-2 bg-primary text-white rounded font-bold">建立</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Project List View
  if (view === ViewState.PROJECT_LIST && project) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 border-[6px] border-secondary rounded-xl m-2 overflow-hidden relative">
        {/* Header */}
        <div className="bg-white border-b-2 border-secondary p-4 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-slate-800 truncate max-w-[50%]">
            [{project.name}]_[{project.month}]
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handleExportJSON}
              className="p-2 text-green-700 hover:bg-green-50 rounded border border-green-700 flex items-center"
              title="儲存專案 (JSON)"
            >
              <Save size={24} />
            </button>
            <button 
              onClick={handleExportZip}
              className="p-2 text-blue-700 hover:bg-blue-50 rounded border border-blue-700 flex items-center"
              title="匯出照片與報表 (ZIP)"
            >
               <FileDown size={24} />
            </button>
            <button 
              onClick={() => setShowExitDialog(true)}
              className="p-2 text-red-700 hover:bg-red-50 rounded border border-red-700 flex items-center"
              title="退出"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {project.records.length === 0 ? (
            <div className="text-center text-slate-400 mt-20">
              尚無紀錄，請點擊右下角新增
            </div>
          ) : (
            project.records.map((record, index) => (
              <div 
                key={record.id}
                onClick={() => { setEditingRecord(record); setView(ViewState.EDIT_RECORD); }}
                className="bg-white border-2 border-secondary rounded-lg p-2 flex gap-3 h-24 items-center shadow-sm active:bg-gray-50"
              >
                {/* Thumbnail */}
                <div className="h-20 w-20 bg-gray-200 shrink-0 border border-red-500 overflow-hidden flex items-center justify-center">
                  <img src={record.originalImage} alt="thumbnail" className="h-full w-full object-cover" />
                </div>
                {/* Info */}
                <div className="flex flex-col justify-center h-full">
                  <span className="font-bold text-lg text-slate-800">
                    [{String(index + 1).padStart(3, '0')}]_[{formatLocationString(record.location)}]
                  </span>
                  <span className="text-sm text-slate-600 truncate">
                    {record.workItem === '其他' ? record.workItemCustom : record.workItem}
                  </span>
                   <span className="text-xs text-slate-400">
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
          className="absolute bottom-6 right-6 bg-white border-2 border-secondary text-secondary rounded-full p-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={40} strokeWidth={3} />
        </button>

        {/* Exit Dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold mb-4">確認退出</h3>
              <p className="mb-6 text-slate-600">您的專案狀態目前暫存在瀏覽器中。若未下載JSON檔案，清除瀏覽器資料可能會導致遺失。</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleExit(true)}
                  className="w-full py-3 bg-green-600 text-white rounded font-bold"
                >
                  儲存並退出 (下載專案檔)
                </button>
                <button 
                  onClick={() => handleExit(false)}
                  className="w-full py-3 bg-red-600 text-white rounded font-bold"
                >
                  不儲存退出
                </button>
                <button 
                  onClick={() => setShowExitDialog(false)}
                  className="w-full py-3 border border-slate-300 rounded text-slate-600"
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

  // 3. Edit View (Modal style)
  if (view === ViewState.EDIT_RECORD) {
    return (
      <div className="bg-gray-50 border-[6px] border-secondary rounded-xl m-2 h-screen overflow-hidden relative">
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

export default App;
