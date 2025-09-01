// utils/geoUtils.ts
export function parseWKTPolygon(wkt: string): number[][] {
  // 解析 "POLYGON ((121.58109765068 25.0332222946741, ...))"
  const coordsMatch = wkt.match(/POLYGON\s*\(\s*\((.*?)\)\s*\)/);
  if (!coordsMatch) throw new Error('Invalid WKT format: ' + wkt);
  
  const coordsStr = coordsMatch[1];
  return coordsStr.split(',').map(pair => {
    const coords = pair.trim().split(/\s+/).map(Number);
    if (coords.length !== 2) throw new Error('Invalid coordinate pair: ' + pair);
    return [coords[0], coords[1]]; // [經度, 緯度]
  });
}

export function getColorByFullRateLevel(level: number): string {
  // 根據滿車率等級返回顏色
  switch (level) {
    case 0: return '#6B7280'; // 灰色 - 無資料
    case 1: return '#EF4444'; // 紅色 - 滿車率 >= 95%
    case 2: return '#F59E0B'; // 橘色 - 80% <= 滿車率 < 95%
    case 3: return '#10B981'; // 綠色 - 滿車率 < 80%
    default: return '#6B7280';
  }
}
