export interface FloorPlan {
  id: number;
  name: string;
  file: File;
  src: string;
}

export interface ProjectInfo {
  id?: string;
  name: string;
  floorPlans: FloorPlan[];
}

export interface MarkerData {
  floor: string;
  isMezzanine: boolean;
  location: string;
  surfaceType: string;
  isIncomplete: boolean;
  noFireBarrier: boolean;
  metal1: string; metal2: string; metal3: string; metal4: string; metal6: string;
  pvc1: string; pvc2: string; pvc3: string; pvc4: string; pvc6: string;
  length: string;
  width: string;
  tempImage: File | null;
}

export interface Marker {
  id: number;
  planIndex: number;
  x: number;
  y: number;
  seq: number;
  data: MarkerData;
  imageBlob: File;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface ImgDimensions {
  width: number;
  height: number;
}

declare global {
  interface Window {
    JSZip: any;
    pdfjsLib: any;
  }
}