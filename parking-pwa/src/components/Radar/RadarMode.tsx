// src/components/Radar/RadarMode.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer as RLMap, TileLayer } from 'react-leaflet';
import { motion } from 'framer-motion';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { ParkingLot } from '../../types/parking';

// 不可移動的地圖組件
const StaticMapContainer: React.FC<{ center: [number, number]; parkingData: ParkingLot[] }> = ({ center }) => {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <RLMap
        center={center}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" />
      </RLMap>
    </div>
  );
};

const RadarMode: React.FC = () => {
  const { location } = useGeolocation();
  const [parkingData, setParkingData] = useState<ParkingLot[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [currentScanRadius, setCurrentScanRadius] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRequestingRef = useRef(false);
  
  const mapCenter: [number, number] = location 
    ? [location.latitude, location.longitude]
    : [25.0478, 121.5170];

  const RADAR_MAX_RADIUS_PX = 480;
  const RADAR_MAX_DISTANCE_KM = 2;
  const SCAN_DURATION = 15000; // 15秒一次完整掃描
  const API_UPDATE_INTERVAL = 15000; // 15秒更新API數據

  // 計算兩點間距離
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 將地理座標轉換為雷達螢幕座標
  const geoToRadarPosition = (parkLat: number, parkLon: number): { x: number; y: number; distance: number } | null => {
    const distance = getDistance(mapCenter[0], mapCenter[1], parkLat, parkLon);
    const maxDistanceM = RADAR_MAX_DISTANCE_KM * 1000;
    
    if (distance > maxDistanceM) return null;
    
    // 計算方位角
    const bearing = Math.atan2(
      Math.sin((parkLon - mapCenter[1]) * Math.PI / 180) * Math.cos(parkLat * Math.PI / 180),
      Math.cos(mapCenter[0] * Math.PI / 180) * Math.sin(parkLat * Math.PI / 180) -
      Math.sin(mapCenter[0] * Math.PI / 180) * Math.cos(parkLat * Math.PI / 180) * Math.cos((parkLon - mapCenter[1]) * Math.PI / 180)
    );
    
    // 轉換為螢幕座標
    const normalizedDistance = Math.min(distance / maxDistanceM, 1);
    const radarDistance = normalizedDistance * RADAR_MAX_RADIUS_PX;
    
    return {
      x: radarDistance * Math.sin(bearing),
      y: -radarDistance * Math.cos(bearing),
      distance: radarDistance
    };
  };

  // 呼叫停車場 API
  const fetchParkingData = useCallback(async () => {
    if (isRequestingRef.current) return;
    
    isRequestingRef.current = true;
    setApiLoading(true);
    
    try {
      console.log('🎯 雷達掃描開始 - 獲取停車場資料');
      const response = await fetch(
        `/.netlify/functions/parks?lat=${mapCenter[0]}&lon=${mapCenter[1]}&type=car&radius=5`
      );
      const result = await response.json();
      
      if (result.ok && result.data) {
        setParkingData(result.data);
        console.log(`✅ 雷達掃描完成: ${result.data.length} 筆資料`);
      } else {
        console.error('API 錯誤:', result);
      }
    } catch (error) {
      console.error('獲取停車場資料失敗:', error);
    } finally {
      setApiLoading(false);
      isRequestingRef.current = false;
    }
  }, [mapCenter]);

  // 雷達掃描動畫 - 與API同步
  useEffect(() => {
    console.log('🎯 啟動雷達掃描動畫');
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % SCAN_DURATION) / SCAN_DURATION;
      
      // 同心圓擴散半徑
      const scanRadius = progress * RADAR_MAX_RADIUS_PX;
      setCurrentScanRadius(scanRadius);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        console.log('🧹 清理雷達動畫');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [SCAN_DURATION, RADAR_MAX_RADIUS_PX]);

  // API 數據更新 - 與掃描頻率同步
  useEffect(() => {
    console.log('🎯 設置雷達掃描週期');
    
    // 立即執行一次
    fetchParkingData();
    
    // 每15秒同步更新
    intervalRef.current = setInterval(() => {
      console.log('⏰ 雷達週期掃描觸發');
      fetchParkingData();
    }, API_UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        console.log('🧹 清理雷達掃描週期');
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchParkingData]);

  // 篩選被雷達掃描到的空車位
  const scannedParkingSpots = useMemo(() => {
    if (!parkingData || !Array.isArray(parkingData)) {
      return [];
    }

    const availableSpots = parkingData.filter(lot => lot && lot.remark === '目前空格');
    console.log(`📍 可用停車位: ${availableSpots.length} 個`);
    
    const scannedSpots = availableSpots
      .map(lot => {
        const position = geoToRadarPosition(lot.lat, lot.lon);
        if (!position) return null;
        
        // 只有被當前掃描波紋覆蓋到的才顯示
        const isScanned = currentScanRadius >= position.distance;
        
        return isScanned ? { ...lot, radarPosition: position } : null;
      })
      .filter(Boolean);
    
    console.log(`🎯 被掃描到: ${scannedSpots.length} 個停車位`);
    return scannedSpots;
  }, [parkingData, currentScanRadius, mapCenter]);

  return (
    <div className="h-full relative overflow-hidden bg-slate-900">
      {/* API 載入狀態 */}
      {apiLoading && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-radar-green/30">
            <span className="text-radar-green text-sm">🎯 雷達掃描中...</span>
          </div>
        </div>
      )}

      {/* 底層地圖 - 不可移動，80%透明度 */}
      <div className="absolute inset-0" style={{ opacity: 0.8 }}>
        <StaticMapContainer center={mapCenter} parkingData={parkingData} />
      </div>

      {/* 雷達覆蓋層 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {/* 雷達背景圓形 */}
        <div 
          className="relative border-2 border-radar-green/60 rounded-full bg-black/30"
          style={{ 
            width: RADAR_MAX_RADIUS_PX * 2, 
            height: RADAR_MAX_RADIUS_PX * 2,
            boxShadow: 'inset 0 0 40px rgba(0, 255, 153, 0.1), 0 0 20px rgba(0, 255, 153, 0.3)'
          }}
        >
          {/* 固定同心圓參考線 */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <div
              key={ratio}
              className="absolute border-2 border-radar-green/30 rounded-full"
              style={{
                width: `${ratio * 100}%`,
                height: `${ratio * 100}%`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* 擴散波紋動畫 - 3個波紋循環 */}
          {Array.from({ length: 3 }, (_, i) => {
            const delay = (i * SCAN_DURATION) / 3;
            return (
              <motion.div
                key={i}
                className="absolute border-4 border-radar-green rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ 
                  width: 0, 
                  height: 0, 
                  opacity: 0.8,
                  borderWidth: 4
                }}
                animate={{
                  width: RADAR_MAX_RADIUS_PX * 2,
                  height: RADAR_MAX_RADIUS_PX * 2,
                  opacity: 0,
                  borderWidth: 0
                }}
                transition={{
                  duration: SCAN_DURATION / 1000,
                  delay: delay / 1000,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            );
          })}
          
          {/* 中心使用者位置 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <motion.div
              className="w-6 h-6 bg-blue-400 rounded-full border-2 border-white"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.9, 1, 0.9]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity 
              }}
              style={{
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.8)'
              }}
            />
          </div>

          {/* 被掃描到的停車位 */}
          {scannedParkingSpots.map(spot => (
            <motion.div
              key={`radar-${spot.parkId}`}
              className="absolute w-4 h-4 bg-radar-green rounded-full z-30 border-2 border-white"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${spot.radarPosition.x}px, ${spot.radarPosition.y}px)`,
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.9)'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.3, 1], 
                opacity: [0, 1, 0.9],
              }}
              transition={{ 
                duration: 0.8,
                ease: 'backOut'
              }}
            />
          ))}
        </div>
      </div>

      {/* HUD 資訊面板 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-radar-green z-30 border-2 border-radar-green/40">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="block font-mono text-base">🎯 RADAR SCANNING</span>
            <span className="block font-mono">範圍: {RADAR_MAX_DISTANCE_KM}km</span>
            <span className="block font-mono">發現車位: {scannedParkingSpots.length} 個</span>
            <span className="block text-xs opacity-70 font-mono">
              掃描進度: {((currentScanRadius / RADAR_MAX_RADIUS_PX) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-right">
            <span className="block font-mono">📍 {mapCenter[0].toFixed(4)}</span>
            <span className="block font-mono">📍 {mapCenter[1].toFixed(4)}</span>
            <span className="block text-xs opacity-70 font-mono">
              總停車場: {parkingData?.length || 0} 個
            </span>
            <div className="flex items-center justify-end mt-1">
              <div className="w-2 h-2 bg-radar-green rounded-full animate-pulse mr-2"></div>
              <span className="text-xs font-mono">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMode;
