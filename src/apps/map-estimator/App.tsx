import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, ChevronDown, Move, MousePointer2, Save, LogOut, PlusCircle } from 'lucide-react';
import useJSZip from './hooks/useJSZip';
import usePDFJS from './hooks/usePDFJS'; 
import dbService from './services/dbService';
import SetupScreen from './components/SetupScreen';
import MarkerModal from './components/MarkerModal';
import ClusterSelectModal from './components/ClusterSelectModal';
import AddPlanModal from './components/AddPlanModal'; 
import { ProjectInfo, FloorPlan, Marker, Transform, ImgDimensions, MarkerData } from './types';

const generateFloorOptions = () => {
  const floors = [];
  for (let i = 18; i >= 1; i--) floors.push(`B${i}`);
  for (let i = 1; i <= 88; i++) floors.push(`${i}`);
  for (let i = 1; i <= 3; i++) floors.push(`R${i}`);
  return floors;
};

const FLOOR_OPTIONS = generateFloorOptions();
const NUMBER_OPTIONS = Array.from({ length: 189 }, (_, i) => i); 
const Y_OFFSET = 30; 

const MapEstimatorApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const isZipLoaded = useJSZip(); 
  const isPDFLoaded = usePDFJS(); 

  const [isRestoring, setIsRestoring] = useState(true); 
  const [step, setStep] = useState<'setup' | 'workspace'>('setup'); 
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ name: '', floorPlans: [] });
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0); 
  const [markers, setMarkers] = useState<Marker[]>([]); 
  const [mode, setMode] = useState<'move' | 'mark'>('move'); 

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 }); 
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  
  const [imgDimensions, setImgDimensions] = useState<ImgDimensions>({ width: 0, height: 0 }); 
  
  const containerRef = useRef<HTMLDivElement>(null); 
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null); 
  const lastDistRef = useRef<number | null>(null); 
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null); 
  
  const markTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); 
  const currentFingerPosRef = useRef<{ clientX: number; clientY: number } | null>(null); 

  const lastLocationRef = useRef<string>('');

  const [isTouching, setIsTouching] = useState(false); 
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 }); 
  const [imgCoord, setImgCoord] = useState<{ x: number | null; y: number | null }>({ x: null, y: null }); 

  const [activeMarker, setActiveMarker] = useState<Partial<Marker> | null>(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [showExitDialog, setShowExitDialog] = useState(false); 
  const [showAddPlanModal, setShowAddPlanModal] = useState(false); 
  
  const [clusterModalState, setClusterModalState] = useState<{ isOpen: boolean; markers: Marker[] }>({
    isOpen: false,
    markers: [],
  });

  const [formData, setFormData] = useState<MarkerData>({
    floor: '1',
    isMezzanine: false,
    location: '',
    surfaceType: '雙面',
    isIncomplete: false, 
    noFireBarrier: false, 
    metal1: '0', metal2: '0', metal3: '0', metal4: '0', metal6: '0',
    pvc1: '0', pvc2: '0', pvc3: '0', pvc4: '0', pvc6: '0',
    length: '0',
    width: '0',
    tempImage: null,
  });

  const isEditing = useMemo(() => {
    return activeMarker && markers.some(m => m.id === activeMarker.id);
  }, [activeMarker, markers]);

  useEffect(() => {
    const checkRestore = async () => {
      try {
        await dbService.init();
        const savedProject = await dbService.getProject();
        const savedMarkers = await dbService.getAllMarkers();

        if (savedProject && savedProject.floorPlans && savedProject.floorPlans.length > 0) {
          const restoredPlans = savedProject.floorPlans.map((p: FloorPlan) => ({
            ...p,
            src: URL.createObjectURL(p.file),
          }));

          setProjectInfo({ ...savedProject, floorPlans: restoredPlans });
          setMarkers(savedMarkers);
          
          if (savedMarkers.length > 0) {
            const lastMarker = savedMarkers.reduce((prev, current) => (prev.id > current.id) ? prev : current);
            if (lastMarker && lastMarker.data.location) {
              lastLocationRef.current = lastMarker.data.location;
            }
          }

          setStep('workspace'); 
        }
      } catch (e) {
        console.error('Restore failed', e);
      } finally {
        setIsRestoring(false);
      }
    };
    checkRestore();
  }, []);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    transformRef.current = { x: 0, y: 0, scale: 1 };
  }, [currentPlanIndex]);

  const visibleMarkers = useMemo(() => {
    const planMarkers = markers.filter(m => m.planIndex === currentPlanIndex);
    if (imgDimensions.width === 0 || imgDimensions.height === 0) return [];

    const thresholdX = (29 / imgDimensions.width) * 100;
    const thresholdY = (29 / imgDimensions.height) * 100;

    interface Cluster {
      ids: number[]; 
      seqs: number[]; 
      sumX: number; 
      sumY: number;
    }

    const clusters: Cluster[] = [];
    const sortedMarkers = [...planMarkers].sort((a, b) => a.seq - b.seq);

    sortedMarkers.forEach(marker => {
      const existing = clusters.find(c => {
        const cx = c.sumX / c.ids.length;
        const cy = c.sumY / c.ids.length;
        return Math.abs(cx - marker.x) < thresholdX && Math.abs(cy - marker.y) < thresholdY;
      });

      if (existing) {
        existing.ids.push(marker.id);
        existing.seqs.push(marker.seq);
        existing.sumX += marker.x;
        existing.sumY += marker.y;
      } else {
        clusters.push({
          ids: [marker.id],
          seqs: [marker.seq],
          sumX: marker.x,
          sumY: marker.y
        });
      }
    });

    return clusters.map(c => ({
      id: c.ids[0], 
      allIds: c.ids, 
      x: c.sumX / c.ids.length, 
      y: c.sumY / c.ids.length, 
      label: c.seqs.join(','), 
      isCluster: c.ids.length > 1 
    }));

  }, [markers, currentPlanIndex, imgDimensions]);

  const addFloorPlans = (newPlans: FloorPlan[]) => {
    setProjectInfo((prev) => ({
      ...prev,
      floorPlans: [...prev.floorPlans, ...newPlans],
    }));
  };

  const handleAddPlanInWorkspace = async (newPlans: FloorPlan[]) => {
    const updatedProjectInfo = {
      ...projectInfo,
      floorPlans: [...projectInfo.floorPlans, ...newPlans],
    };
    setProjectInfo(updatedProjectInfo);
    await dbService.saveProject(updatedProjectInfo);
    if (newPlans.length > 0) {
      const newIndex = projectInfo.floorPlans.length; 
      setCurrentPlanIndex(newIndex);
    }
  };


  const updatePlanName = (idx: number, newName: string) => {
    const newPlans = [...projectInfo.floorPlans];
    newPlans[idx].name = newName;
    setProjectInfo({ ...projectInfo, floorPlans: newPlans });
  };

  const removePlan = (index: number) => {
    const newPlans = [...projectInfo.floorPlans];
    newPlans.splice(index, 1);
    setProjectInfo((prev) => ({ ...prev, floorPlans: newPlans }));
  };

  const startProject = async () => {
    if (!projectInfo.name || projectInfo.floorPlans.length === 0) {
      alert('請輸入專案名稱並至少匯入一張平面圖');
      return;
    }
    await dbService.saveProject(projectInfo);
    setStep('workspace');
  };

  const handleReset = async () => {
    if (confirm('確定要清除所有舊資料並開始新專案嗎？此動作無法復原。')) {
      await dbService.clearAll();
      window.location.reload();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (markTimeoutRef.current) {
        clearTimeout(markTimeoutRef.current);
        markTimeoutRef.current = null;
      }
      setIsTouching(false);

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      lastDistRef.current = dist;
      lastCenterRef.current = { x: centerX, y: centerY };

    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (mode === 'mark') {
        currentFingerPosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
        
        markTimeoutRef.current = setTimeout(() => {
          setIsTouching(true);
          const pos = currentFingerPosRef.current || { clientX: touch.clientX, clientY: touch.clientY };
          updateLoupe(pos); 
        }, 100); 

      } else {
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;

      if (!lastDistRef.current || !lastCenterRef.current) {
        lastDistRef.current = dist;
        lastCenterRef.current = { x: midX, y: midY };
        return;
      }

      const currentT = transformRef.current;
      const scaleFactor = dist / lastDistRef.current;
      
      let newScale = currentT.scale * scaleFactor;
      newScale = Math.min(Math.max(newScale, 0.1), 20);
      
      const effectiveScaleFactor = newScale / currentT.scale;

      const newX = midX - (lastCenterRef.current.x - currentT.x) * effectiveScaleFactor;
      const newY = midY - (lastCenterRef.current.y - currentT.y) * effectiveScaleFactor;

      const newTransform = { x: newX, y: newY, scale: newScale };
      
      setTransform(newTransform);
      transformRef.current = newTransform;
      
      lastDistRef.current = dist;
      lastCenterRef.current = { x: midX, y: midY };

    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (mode === 'mark') {
        currentFingerPosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
        if (isTouching) {
          updateLoupe({ clientX: touch.clientX, clientY: touch.clientY });
        }
      } else if (mode === 'move') {
        const last = lastTouchRef.current;
        if (last) {
          const dx = touch.clientX - last.x;
          const dy = touch.clientY - last.y;
          
          const currentT = transformRef.current;
          const newTransform = { ...currentT, x: currentT.x + dx, y: currentT.y + dy };
          
          setTransform(newTransform);
          transformRef.current = newTransform;
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (markTimeoutRef.current) {
      clearTimeout(markTimeoutRef.current);
      markTimeoutRef.current = null;
    }

    lastDistRef.current = null;
    lastTouchRef.current = null;
    lastCenterRef.current = null;

    if (mode === 'mark' && isTouching) {
      setIsTouching(false);
      if (imgCoord.x !== null && imgCoord.y !== null) {
        openNewMarkerModal(imgCoord as { x: number; y: number });
      }
    }
  };

  const updateLoupe = (pos: { clientX: number; clientY: number }) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const touchX = pos.clientX - rect.left;
    const touchY = pos.clientY - rect.top;
    setTouchPos({ x: touchX, y: touchY });

    const effectiveY = touchY - Y_OFFSET;

    const currentT = transformRef.current;
    const rawX = (touchX - currentT.x) / currentT.scale;
    const rawY = (effectiveY - currentT.y) / currentT.scale;

    if (
      rawX >= 0 &&
      rawX <= imgDimensions.width &&
      rawY >= 0 &&
      rawY <= imgDimensions.height
    ) {
      setImgCoord({ x: rawX, y: rawY });
    } else {
      setImgCoord({ x: null, y: null });
    }
  };

  const handleMarkerClick = (marker: Marker) => {
    setActiveMarker(marker);
    setFormData({ 
      ...marker.data, 
      tempImage: marker.imageBlob 
    });
    setIsModalOpen(true);
  };

  const handleClusterSelect = (marker: Marker) => {
    setClusterModalState((prev) => ({ ...prev, isOpen: false }));
    handleMarkerClick(marker);
  };

  const openNewMarkerModal = (coord: { x: number; y: number }) => {
    const maxSeq = markers.reduce((max, m) => Math.max(max, m.seq), 0);
    const nextSeq = maxSeq + 1;

    const xPct = (coord.x / imgDimensions.width) * 100;
    const yPct = (coord.y / imgDimensions.height) * 100;

    setActiveMarker({
      id: Date.now(),
      planIndex: currentPlanIndex,
      x: xPct,
      y: yPct,
      seq: nextSeq,
    });

    setFormData((prev) => ({
      ...prev,
      location: lastLocationRef.current,
      surfaceType: '雙面',
      isIncomplete: false, 
      noFireBarrier: false, 
      metal1: '0', metal2: '0', metal3: '0', metal4: '0', metal6: '0',
      pvc1: '0', pvc2: '0', pvc3: '0', pvc4: '0', pvc6: '0',
      length: '0',
      width: '0',
      tempImage: null,
    }));

    setIsModalOpen(true);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, tempImage: file }));
    }
  };

  const saveMarker = async () => {
    if (!formData.tempImage) {
      alert('請拍攝或上傳照片');
      return;
    }
    if (!formData.location) {
      alert('請輸入位置');
      return;
    }

    if (!activeMarker) return;

    const newMarker: Marker = {
      ...(activeMarker as Marker),
      data: { ...formData },
      imageBlob: formData.tempImage,
    };

    const isUpdate = markers.some(m => m.id === newMarker.id);

    if (isUpdate) {
      setMarkers((prev) => prev.map(m => m.id === newMarker.id ? newMarker : m));
    } else {
      setMarkers((prev) => [...prev, newMarker]);
    }

    await dbService.addMarker(newMarker);
    lastLocationRef.current = formData.location;

    setIsModalOpen(false);
    setActiveMarker(null);
    setMode('move'); 
  };

  const handleSaveProject = async () => {
    if (!window.JSZip) {
      alert('系統模組載入中，請稍候');
      return;
    }
    
    try {
      const zip = new window.JSZip();
      
      const floorPlansMeta = projectInfo.floorPlans.map(p => ({
        id: p.id,
        name: p.name,
        fileName: `plans/${p.id}.png` 
      }));

      const markersMeta = markers.map(m => ({
        ...m,
        imageBlob: null, 
        imageFileName: `markers/${m.id}.jpg`
      }));

      const projectMeta = {
        name: projectInfo.name,
        floorPlans: floorPlansMeta,
        markers: markersMeta,
        version: "1.0"
      };

      zip.file("data.json", JSON.stringify(projectMeta));

      const assetsFolder = zip.folder("assets");
      const plansFolder = assetsFolder?.folder("plans");
      const markersFolder = assetsFolder?.folder("markers");

      projectInfo.floorPlans.forEach(p => {
        plansFolder?.file(`${p.id}.png`, p.file);
      });

      markers.forEach(m => {
        markersFolder?.file(`${m.id}.jpg`, m.imageBlob);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${projectInfo.name || 'Project'}.siteproj`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error(error);
      alert('儲存專案失敗，請檢查記憶體空間');
    }
  };

  const handleLoadProject = async (file: File) => {
    if (!window.JSZip) return;
    
    setIsRestoring(true);
    try {
      const zip = await new window.JSZip().loadAsync(file);
      
      const jsonText = await zip.file("data.json")?.async("text");
      if (!jsonText) throw new Error("Invalid project file: missing data.json");
      
      const meta = JSON.parse(jsonText);
      
      await dbService.clearAll();

      const newPlans: FloorPlan[] = [];
      if (meta.floorPlans) {
        for (const pMeta of meta.floorPlans) {
          const blob = await zip.file(`assets/${pMeta.fileName}`)?.async("blob");
          if (blob) {
             const fileObj = new File([blob], pMeta.name, { type: blob.type });
             newPlans.push({
               id: pMeta.id,
               name: pMeta.name,
               file: fileObj,
               src: URL.createObjectURL(fileObj)
             });
          }
        }
      }

      const newMarkers: Marker[] = [];
      if (meta.markers) {
         for (const mMeta of meta.markers) {
            const blob = await zip.file(`assets/${mMeta.imageFileName}`)?.async("blob");
            if (blob) {
              const fileObj = new File([blob], `marker_${mMeta.id}.jpg`, { type: 'image/jpeg' });
              const { imageFileName, imageBlob, ...rest } = mMeta;
              newMarkers.push({
                ...rest,
                imageBlob: fileObj
              });
            }
         }
      }

      const newProjectInfo: ProjectInfo = {
        name: meta.name,
        floorPlans: newPlans
      };

      await dbService.saveProject(newProjectInfo);
      for (const m of newMarkers) {
        await dbService.addMarker(m);
      }

      setProjectInfo(newProjectInfo);
      setMarkers(newMarkers);
      setStep('workspace');
      setCurrentPlanIndex(0);

      alert(`專案 ${meta.name} 讀取成功！`);

    } catch (e) {
      console.error(e);
      alert('讀取失敗：檔案格式錯誤或損毀');
      window.location.reload();
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExitClick = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async (shouldSave: boolean) => {
    if (shouldSave) {
      await handleSaveProject();
      setTimeout(async () => {
        await dbService.clearAll();
        onExit(); // 修改：呼叫 Props 傳入的退出函式
      }, 500);
    } else {
      await dbService.clearAll();
      onExit(); // 修改：呼叫 Props 傳入的退出函式
    }
  };

  const getMarkerFileName = (m: Marker) => {
    const d = m.data;
    let floorStr = d.floor;
    if (d.isMezzanine) floorStr = `${d.floor}M`;
    floorStr += 'F';
    const seqStr = String(m.seq).padStart(3, '0');
    
    const metalPart = `${d.metal1 || 0}_${d.metal2 || 0}_${d.metal3 || 0}_${d.metal4 || 0}_${d.metal6 || 0}`;
    const pvcPart = `${d.pvc1 || 0}_${d.pvc2 || 0}_${d.pvc3 || 0}_${d.pvc4 || 0}_${d.pvc6 || 0}`;
    
    const incompleteFlag = d.isIncomplete ? '1' : '0';
    const noFireBarrierFlag = d.noFireBarrier ? '1' : '0';

    return `${seqStr}_${floorStr}_${d.location}_${metalPart}_${pvcPart}_${d.length}_${d.width}_${d.surfaceType}_${incompleteFlag}_${noFireBarrierFlag}`;
  };

  const handleExport = async () => {
    if (!window.JSZip) {
      alert('匯出模組尚未載入，請稍候再試');
      return;
    }

    const zip = new window.JSZip();
    const folderName = projectInfo.name || 'Project';
    const mainFolder = zip.folder(folderName);
    const photosFolder = mainFolder.folder('photos');
    const mapsFolder = mainFolder.folder('maps');

    markers.forEach((m) => {
      const fileName = getMarkerFileName(m) + '.jpg';
      photosFolder.file(fileName, m.imageBlob);
    });

    const uniquePlansIndices = [...new Set(markers.map((m) => m.planIndex))];
    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    for (const planIndex of uniquePlansIndices) {
      const plan = projectInfo.floorPlans[planIndex];
      const planMarkers = markers.filter((m) => m.planIndex === planIndex);

      try {
        const img = await loadImage(plan.src);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);

          planMarkers.forEach((m) => {
            const x = (m.x / 100) * canvas.width;
            const y = (m.y / 100) * canvas.height;
            const size = Math.max(30, canvas.width * 0.02);

            ctx.fillStyle = '#FFFF00';
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = size * 0.15;
            ctx.beginPath();
            ctx.rect(x - size / 2, y - size / 2, size, size);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#000000';
            ctx.font = `bold ${size * 0.7}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(m.seq), x, y);
          });

          const mapBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg')
          );
          if (mapBlob) {
            mapsFolder.file(`${plan.name}_marked.jpg`, mapBlob);
          }
        }
      } catch (e) {
        console.error('Error generating map', e);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${folderName}_Report.zip`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        載入中...
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <SetupScreen
        projectInfo={projectInfo}
        setProjectInfo={setProjectInfo}
        onFileUpload={addFloorPlans as any} 
        onUpdatePlanName={updatePlanName}
        onRemovePlan={removePlan}
        onStart={startProject}
        onReset={handleReset}
        onLoadProject={handleLoadProject}
        isZipLoaded={isZipLoaded}
        isPDFLoaded={isPDFLoaded} 
        onExit={onExit} // 新增：傳遞退出
      />
    );
  }

  const currentPlan = projectInfo.floorPlans[currentPlanIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
      <div className="bg-white px-4 py-3 shadow-md z-20 flex items-center justify-between shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-500 font-bold truncate max-w-[150px]">
            {projectInfo.name}
          </span>
          <div className="relative inline-flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <select
                value={currentPlanIndex}
                onChange={(e) => {
                  setCurrentPlanIndex(Number(e.target.value));
                }}
                className="font-bold text-lg bg-transparent pr-6 outline-none appearance-none truncate max-w-[200px]"
              >
                {projectInfo.floorPlans.map((p, i) => (
                  <option key={p.id} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 w-4 h-4 pointer-events-none text-gray-500" />
            </div>

            <button
              onClick={() => setShowAddPlanModal(true)}
              className="text-blue-600 hover:text-blue-800 transition p-1"
              title="新增平面圖"
            >
              <PlusCircle size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
             onClick={handleSaveProject}
             disabled={!isZipLoaded}
             title="儲存專案檔 (.siteproj)"
             className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition active:scale-95"
          >
            <Save size={20} />
          </button>

          <button
            onClick={handleExport}
            disabled={!isZipLoaded}
            title="匯出照片與報表"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition ${
              isZipLoaded ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}
          >
            <Download size={18} />
            <span className="hidden sm:inline">匯出</span>
          </button>

          <button
            onClick={handleExitClick}
            title="退出專案"
            className="p-2 bg-gray-100 text-red-500 rounded-lg hover:bg-gray-200 transition active:scale-95"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[#2a2a2a] touch-none select-none"
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
          className="absolute top-0 left-0"
        >
          <img
            src={currentPlan.src}
            alt="Floor Plan"
            className="max-w-none pointer-events-none select-none block"
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              const imgW = img.width;
              const imgH = img.height;
              setImgDimensions({ width: imgW, height: imgH });
              if (containerRef.current) {
                const containerW = containerRef.current.clientWidth;
                const scale = containerW / imgW;
                setTransform({ x: 0, y: 0, scale });
                transformRef.current = { x: 0, y: 0, scale };
              }
            }}
          />
          {visibleMarkers.map((m) => (
              <div
                key={m.id}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode !== 'move') return;

                  if (m.isCluster) {
                    const clusterMarkers = markers.filter(marker => m.allIds.includes(marker.id));
                    clusterMarkers.sort((a, b) => a.seq - b.seq);
                    setClusterModalState({ isOpen: true, markers: clusterMarkers });
                  } else {
                    const target = markers.find(marker => marker.id === m.id);
                    if (target) handleMarkerClick(target);
                  }
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 min-w-[1.625rem] h-[1.625rem] px-1 bg-yellow-400 border border-red-600 flex items-center justify-center text-[13px] font-bold text-black shadow-sm z-10 whitespace-nowrap`}
              >
                {m.label}
              </div>
            ))}
        </div>

        {isTouching && mode === 'mark' && imgCoord.x !== null && (
          <div
            className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gray-100 z-50 flex items-center justify-center"
            style={{
              width: '140px',
              height: '140px',
              left: touchPos.x - 70,
              top: touchPos.y - 180,
            }}
          >
            <div className="relative w-full h-full overflow-hidden bg-black">
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: imgDimensions.width * 2, 
                  height: imgDimensions.height * 2,
                  transform: `translate(${-(imgCoord.x || 0) * 2 + 70}px, ${
                    -(imgCoord.y || 0) * 2 + 70
                  }px)`,
                }}
              >
                <img
                  src={currentPlan.src}
                  alt="magnified"
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: 'none',
                  }}
                />
                {visibleMarkers.map((m) => (
                  <div
                    key={`loupe-${m.id}`}
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 min-w-[1.625rem] h-[1.625rem] px-1 bg-yellow-400 border border-red-600 flex items-center justify-center text-[13px] font-bold text-black shadow-sm whitespace-nowrap`}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-0.5 h-6 bg-red-500/80 absolute"></div>
                <div className="w-6 h-0.5 bg-red-500/80 absolute"></div>
                <div className="w-2 h-2 border border-red-500 rounded-full absolute"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white pb-safe pt-2 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-around items-center border-t shrink-0 z-20">
        <button
          onClick={() => setMode('move')}
          className={`flex-1 flex flex-col items-center py-3 rounded-lg transition-all duration-200 ${
            mode === 'move'
              ? 'bg-blue-50 text-blue-600 translate-y-[-2px]'
              : 'text-gray-400'
          }`}
        >
          <Move className={`mb-1 ${mode === 'move' ? 'scale-110' : ''}`} />
          <span className="text-xs font-bold">移動/縮放</span>
        </button>

        <div className="w-px h-8 bg-gray-200 mx-2"></div>

        <button
          onClick={() => setMode('mark')}
          className={`flex-1 flex flex-col items-center py-3 rounded-lg transition-all duration-200 ${
            mode === 'mark'
              ? 'bg-red-50 text-red-600 translate-y-[-2px]'
              : 'text-gray-400'
          }`}
        >
          <MousePointer2
            className={`mb-1 ${mode === 'mark' ? 'scale-110' : ''}`}
          />
          <span className="text-xs font-bold">選取位置 (按住)</span>
        </button>
      </div>

      <ClusterSelectModal
        isOpen={clusterModalState.isOpen}
        onClose={() => setClusterModalState(prev => ({ ...prev, isOpen: false }))}
        markers={clusterModalState.markers}
        onSelect={handleClusterSelect}
      />

      <MarkerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeMarker={activeMarker}
        formData={formData}
        setFormData={setFormData}
        onSave={saveMarker}
        onPhotoCapture={handlePhotoCapture}
        FLOOR_OPTIONS={FLOOR_OPTIONS}
        NUMBER_OPTIONS={NUMBER_OPTIONS}
        isEditing={!!isEditing}
      />

      <AddPlanModal 
        isOpen={showAddPlanModal}
        onClose={() => setShowAddPlanModal(false)}
        onConfirm={handleAddPlanInWorkspace}
        isPDFLoaded={isPDFLoaded}
      />

      {showExitDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">確認退出</h3>
            <p className="text-gray-600 mb-6 text-sm">
              您確定要結束目前的專案嗎？<br />
              若尚未儲存，所有進度將會遺失。
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleConfirmExit(true)}
                disabled={!isZipLoaded}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Save size={18} />
                儲存專案並退出
              </button>
              <button 
                onClick={() => handleConfirmExit(false)}
                className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition active:scale-95"
              >
                不儲存直接退出
              </button>
              <button 
                onClick={() => setShowExitDialog(false)}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition active:scale-95"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEstimatorApp;