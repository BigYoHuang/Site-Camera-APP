import { RecordItem, ProjectData, LocationData } from '../types';

export const formatLocationString = (loc: LocationData): string => {
  let parts = [];
  if (loc.building) parts.push(`${loc.building}棟`);
  
  let floorStr = '';
  if (loc.floorStart) {
    floorStr += `${loc.floorStart}F`;
    if (loc.floorEnd) {
      floorStr += `~${loc.floorEnd}F`;
    }
  } else if (loc.floorEnd) {
    floorStr += `${loc.floorEnd}F`;
  }
  if (floorStr) parts.push(floorStr);
  
  if (loc.details) parts.push(loc.details);
  
  return parts.join(' ');
};

export const generateWatermark = async (
  base64Image: string,
  record: RecordItem,
  projectName: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('No context');
        return;
      }

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // --- Watermark Configuration ---
      // Original Scale Factor was canvas.width / 1000.
      // Target: Height ~ 2/3, Width ~ 3/4.
      
      // We reduce the font size to reduce height significantly.
      // Previous font size base was 24. New target is approx 16 (2/3).
      // We reduce the label width to reduce overall width.
      
      const scaleFactor = canvas.width / 1000;
      
      // Configuration for smaller watermark
      const fontSize = Math.max(12, Math.floor(16 * scaleFactor)); // Reduced from 24 -> 16
      const lineHeight = Math.floor(fontSize * 1.3); // Tighter line height
      const padding = Math.floor(12 * scaleFactor); // Reduced padding from 20 -> 12
      const cellPadding = Math.floor(6 * scaleFactor); // Reduced cell padding from 10 -> 6
      
      const rows = [
        { label: '工程名稱', value: `${projectName} 消防工程` },
        { label: '施工位置', value: formatLocationString(record.location) },
        { label: '施工項目', value: record.workItem === '其他' ? (record.workItemCustom || '其他') : record.workItem },
        { label: '施工日期', value: record.date },
        { label: '備註', value: record.note || '-' },
      ];

      // Calculate table dimensions
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Reduced fixed label width (was 120 -> 90 ~ 3/4)
      const labelWidth = Math.floor(90 * scaleFactor); 
      
      // Calculate max width needed for values
      let maxTextWidth = 0;
      rows.forEach(row => {
        const w = ctx.measureText(row.value).width;
        if (w > maxTextWidth) maxTextWidth = w;
      });
      
      const tableWidth = labelWidth + maxTextWidth + (cellPadding * 3);
      const tableHeight = (rows.length * lineHeight) + (cellPadding * (rows.length + 1));

      // Position: Bottom Left
      const startX = padding;
      const startY = canvas.height - tableHeight - padding;

      // Draw Semi-transparent Background (White Glass)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Slightly more opaque for readability
      ctx.fillRect(startX, startY, tableWidth, tableHeight);
      
      // Draw Border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1.5 * scaleFactor;
      ctx.strokeRect(startX, startY, tableWidth, tableHeight);

      // Draw Text
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';

      rows.forEach((row, index) => {
        const rowY = startY + cellPadding + (index * lineHeight) + (lineHeight / 2);
        
        // Label
        ctx.textAlign = 'left';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(row.label, startX + cellPadding, rowY);

        // Value
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(row.value, startX + labelWidth + (cellPadding * 2), rowY);
      });

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
};
