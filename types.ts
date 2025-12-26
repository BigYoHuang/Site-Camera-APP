export interface LocationData {
  building: string; // 棟
  floorStart: string; // 起始樓層
  floorEnd: string; // 結束樓層
  details: string; // 詳細位置
}

export interface RecordItem {
  id: string;
  timestamp: number;
  originalImage: string; // Base64 of original
  watermarkedImage?: string; // Base64 of watermarked (generated on save/export)
  location: LocationData;
  workItem: string;
  workItemCustom?: string; // If 'Other' is selected
  date: string; // YYYY-MM-DD
  note: string;
}

export interface ProjectData {
  name: string; // 案場名稱
  month: string; // 請款月份 YYYYMM
  records: RecordItem[];
  lastModified: number;
}

export enum ViewState {
  HOME = 'HOME',
  PROJECT_LIST = 'PROJECT_LIST',
  EDIT_RECORD = 'EDIT_RECORD'
}

export const WORK_ITEMS = [
  "RC套管放樣",
  "消防電配管",
  "火警、廣播平面穿線",
  "消防廣播幹線完成",
  "授信、廣播主機安裝",
  "感知器、喇叭安裝完成",
  "消防燈具裝置完成",
  "器具安裝",
  "消防栓箱組立完成",
  "消防、泡沫泵浦安裝",
  "撒水平面配管",
  "幹(立)管配管",
  "泡沫、撒水管試壓完成",
  "排煙設備完成",
  "其他"
];
