// src/utils/coordinates.ts
export function geoToRadar(
  userLat: number, 
  userLon: number, 
  targetLat: number, 
  targetLon: number, 
  maxRange: number
) {
  // 計算距離 (Haversine 公式)
  const distance = getDistance(userLat, userLon, targetLat, targetLon);
  
  // 計算方位角
  const bearing = getBearing(userLat, userLon, targetLat, targetLon);
  
  const radarRadius = 150; // 雷達顯示半徑 (px)
  const normalizedDistance = Math.min(distance / maxRange, 1);
  const radarDistance = normalizedDistance * radarRadius;
  
  const angle = (bearing * Math.PI) / 180;
  
  return {
    x: radarRadius + radarDistance * Math.sin(angle),
    y: radarRadius - radarDistance * Math.cos(angle),
    distance,
    bearing
  };
}
