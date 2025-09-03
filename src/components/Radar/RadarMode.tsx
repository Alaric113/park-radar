// src/components/Radar/RadarMode.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer as RLMap, TileLayer, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { motion } from 'framer-motion';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { ParkingLot } from '../../types/parking';
import L from 'leaflet';

// 地圖中心同步組件
const MapCenterSync: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center[0], center[1], map]);

  return null;
};

// 不可移動的地圖組件
const StaticMapContainer: React.FC<{ 
  center: [number, number]; 
  parkingData: ParkingLot[];
  scannedParkingIds: Set<string>;
}> = ({ center, parkingData, scannedParkingIds }) => {
  
  // 根據停車格狀態決定顏色
  const getParkingSpotColor = (remark: string) => {
    if (!remark || remark === '') return '#6B7280'; // 灰色 - 無資料
    if (remark === '目前空格') return '#10B981'; // 綠色 - 空格可停車
    if (remark === '目前有車停放') return '#EF4444'; // 紅色 - 已被占用
    return '#F59E0B'; // 橘色 - 其他狀況
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <RLMap
        center={center}
        zoom={17}
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
        
        {/* 同步地圖中心 */}
        <MapCenterSync center={center} />
        
        {/* 渲染每個路邊停車格的 Polygon */}
        {parkingData?.map((spot) => {
          const isScanned = scannedParkingIds.has(spot.parkId);
          const color = getParkingSpotColor(spot!.remark);
          
          // 只有被掃描到的停車格才顯示
          if (!isScanned || !spot.wkt) return null;
          
          try {
            // 解析 WKT Polygon 座標
            const coordsMatch = spot.wkt.match(/POLYGON\s*\(\s*\((.*?)\)\s*\)/);
            if (coordsMatch) {
              const coordsStr = coordsMatch[1];
              const coordinates = coordsStr.split(',').map(pair => {
                const [lon, lat] = pair.trim().split(' ').map(Number);
                return [lat, lon] as [number, number];
              });
              
              return (
                <Polygon
                  key={`parking-spot-${spot.parkId}`}
                  positions={coordinates}
                  pathOptions={{
                    color: color,
                    weight: 2,
                    opacity: 0.9,
                    fillColor: color,
                    fillOpacity: spot.remark === '目前空格' ? 0.6 : 0.4
                  }}
                />
              );
            }
          } catch (error) {
            console.error('解析停車格 WKT 失敗:', spot.parkId, error);
          }

          return null;
        })}
      </RLMap>
    </div>
  );
};

const RadarMode: React.FC = () => {
  const { location, error: locationError } = useGeolocation();
  const [parkingData, setParkingData] = useState<ParkingLot[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [currentScanRadius, setCurrentScanRadius] = useState(0);
  const [scannedParkingIds, setScannedParkingIds] = useState<Set<string>>(new Set());
  const [radarSize, setRadarSize] = useState(0); // 新增：動態雷達尺寸
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRequestingRef = useRef(false);
  const lastRequestTime = useRef<number>(0);
  const currentUserLocation = useRef<[number, number]>([25.0478, 121.5170]);
  
  const RADAR_MAX_DISTANCE_KM = 1.5;
  const SCAN_DURATION = 8000; // 8秒一次完整掃描
  const API_UPDATE_INTERVAL = 15000; // 15秒更新API數據
  const MIN_REQUEST_INTERVAL = 10000; // 最小請求間隔10秒

  // 新增：自適應雷達尺寸計算
  useEffect(() => {
    const updateRadarSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // 取螢幕寬度和高度的較小值的80%，但限制在200-500px之間
      const size = Math.min(screenWidth, screenHeight) * 0.8;
      const clampedSize = Math.max(200, Math.min(500, size));
      
      setRadarSize(clampedSize);
      console.log(`🎯 雷達尺寸更新: ${clampedSize}px (螢幕: ${screenWidth}x${screenHeight})`);
    };

    updateRadarSize();
    window.addEventListener('resize', updateRadarSize);
    
    return () => {
      window.removeEventListener('resize', updateRadarSize);
    };
  }, []);

  // 計算雷達半徑
  const radarMaxRadiusPx = useMemo(() => radarSize / 2, [radarSize]);

  // 更新用戶位置
  useEffect(() => {
    if (location) {
      const newLocation: [number, number] = [location.latitude, location.longitude];
      currentUserLocation.current = newLocation;
      console.log('🎯 用戶位置更新:', newLocation);
    }
  }, [location]);

  // 當前地圖中心就是用戶位置
  const mapCenter: [number, number] = currentUserLocation.current;

  // 計算兩點間距離
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
  }, []);

  // 將地理座標轉換為雷達螢幕座標 - 使用動態半徑
  const geoToRadarPosition = useCallback((parkLat: number, parkLon: number): { x: number; y: number; distance: number; distanceKm: number } | null => {
    if (radarMaxRadiusPx === 0) return null; // 等待雷達尺寸計算完成
    
    const distance = getDistance(mapCenter[0], mapCenter[1], parkLat, parkLon);
    const maxDistanceM = RADAR_MAX_DISTANCE_KM * 1000;
    
    if (distance > maxDistanceM) return null;
    
    // 計算方位角
    const bearing = Math.atan2(
      Math.sin((parkLon - mapCenter[1]) * Math.PI / 180) * Math.cos(parkLat * Math.PI / 180),
      Math.cos(mapCenter[0] * Math.PI / 180) * Math.sin(parkLat * Math.PI / 180) -
      Math.sin(mapCenter[0] * Math.PI / 180) * Math.cos(parkLat * Math.PI / 180) * Math.cos((parkLon - mapCenter[1]) * Math.PI / 180)
    );
    
    // 轉換為螢幕座標 - 使用動態半徑
    const normalizedDistance = Math.min(distance / maxDistanceM, 1);
    const radarDistance = normalizedDistance * radarMaxRadiusPx;
    
    return {
      x: radarDistance * Math.sin(bearing),
      y: -radarDistance * Math.cos(bearing),
      distance: radarDistance,
      distanceKm: distance / 1000
    };
  }, [mapCenter, getDistance, radarMaxRadiusPx]);

  // 呼叫停車場 API - 加入防抖機制
  const fetchParkingData = useCallback(async (reason = 'manual') => {
    const now = Date.now();
    
    // 防止頻繁請求
    if (isRequestingRef.current || (now - lastRequestTime.current < MIN_REQUEST_INTERVAL)) {
      console.log('🚫 請求被限制:', reason, 'isRequesting:', isRequestingRef.current, 'timeSince:', now - lastRequestTime.current);
      return;
    }
    
    isRequestingRef.current = true;
    lastRequestTime.current = now;
    setApiLoading(true);
    
    try {
      console.log(`🎯 雷達掃描開始 (${reason}) - 獲取停車場資料:`, mapCenter);
      const response = await fetch(
        `/.netlify/functions/parks?lat=${mapCenter[0]}&lon=${mapCenter[1]}&type=car&radius=3`
      );
      const result = await response.json();
      
      if (result.ok && result.data) {
        setParkingData(result.data);
        console.log(`✅ 雷達掃描完成 (${reason}): ${result.data.length} 筆資料`);
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

  // 根據當前掃描半徑計算已掃描的停車場
  const currentScannedIds = useMemo(() => {
    if (!parkingData || !Array.isArray(parkingData) || radarMaxRadiusPx === 0) {
      return new Set<string>();
    }

    const scannedIds = new Set<string>();
    
    parkingData.forEach(lot => {
      const position = geoToRadarPosition(lot.lat, lot.lon);
      if (position && currentScanRadius >= position.distance) {
        scannedIds.add(lot.parkId);
      }
    });
    
    return scannedIds;
  }, [parkingData, currentScanRadius, geoToRadarPosition, radarMaxRadiusPx]);

  // 更新已掃描的停車場ID集合
  useEffect(() => {
    setScannedParkingIds(prev => {
      const newSet = new Set(prev);
      currentScannedIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [currentScannedIds]);

  // 篩選範圍內的可用停車位用於雷達顯示
  const availableSpotsInRange = useMemo(() => {
    if (!parkingData || !Array.isArray(parkingData) || radarMaxRadiusPx === 0) {
      return [];
    }

    const availableSpots = parkingData.filter(lot => 
      lot && lot.remark === '目前空格' && lot.carRemainderNum > 0
    );
    
    const spotsInRange = availableSpots
      .map(lot => {
        const position = geoToRadarPosition(lot.lat, lot.lon);
        if (!position) return null;
        
        return { ...lot, radarPosition: position };
      })
      .filter(Boolean);
    
    return spotsInRange;
  }, [parkingData, geoToRadarPosition, radarMaxRadiusPx]);

  // 被掃描到的空車位
  const scannedAvailableSpots = useMemo(() => {
    return availableSpotsInRange.filter(spot => 
      spot && currentScanRadius >= spot.radarPosition.distance
    );
  }, [availableSpotsInRange, currentScanRadius]);

  // 雷達掃描動畫 - 使用動態半徑
  useEffect(() => {
    if (radarMaxRadiusPx === 0) return; // 等待雷達尺寸計算完成
    
    console.log('🎯 啟動雷達掃描動畫, 半徑:', radarMaxRadiusPx);
    let startTime: number | null = null;
    let lastResetTime: number = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % SCAN_DURATION) / SCAN_DURATION;
      
      // 每次掃描開始時清空已掃描集合
      if (elapsed - lastResetTime >= SCAN_DURATION) {
        setScannedParkingIds(new Set());
        lastResetTime = elapsed;
      }
      
      // 同心圓擴散半徑 - 使用動態半徑
      const scanRadius = progress * radarMaxRadiusPx;
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
  }, [radarMaxRadiusPx]); // 依賴動態半徑

  // API 數據更新 - 與掃描頻率同步
  useEffect(() => {
    console.log('🎯 設置雷達掃描週期');
    
    // 立即執行一次
    fetchParkingData('initial');
    
    // 每15秒同步更新
    intervalRef.current = setInterval(() => {
      console.log('⏰ 雷達週期掃描觸發');
      fetchParkingData('interval');
    }, API_UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        console.log('🧹 清理雷達掃描週期');
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchParkingData]);

  // 當用戶位置變化時，重新獲取數據
  useEffect(() => {
    if (location) {
      console.log('📍 用戶位置變化，重新獲取停車場數據');
      // 延遲一點時間再獲取，避免太頻繁
      setTimeout(() => {
        fetchParkingData('location_change');
      }, 2000);
    }
  }, [location?.latitude, location?.longitude]);

  // 等待雷達尺寸計算完成
  if (radarSize === 0) {
    return (
      <div className="h-full bg-slate-900 flex items-center justify-center">
        <div className="text-green-400 text-lg">🎯 雷達初始化中...</div>
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden bg-slate-900">
      {/* API 載入狀態和位置錯誤 */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        {apiLoading && (
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-400/30">
            <span className="text-green-400 text-sm">🎯 雷達掃描中...</span>
          </div>
        )}
        {locationError && (
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-red-400/30">
            <span className="text-red-400 text-sm">❌ {locationError}</span>
          </div>
        )}
        {!location && !locationError && (
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-400/30">
            <span className="text-yellow-400 text-sm">📍 定位中...</span>
          </div>
        )}
      </div>

      {/* 底層地圖 - 顯示被掃描到的停車場 */}
      <div className="absolute inset-0" style={{ opacity: 0.7 }}>
        <StaticMapContainer 
          center={mapCenter} 
          parkingData={parkingData} 
          scannedParkingIds={scannedParkingIds}
        />
      </div>

      {/* 雷達覆蓋層 - 使用動態尺寸 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {/* 雷達背景圓形 - 使用動態尺寸 */}
        <div 
          className="relative border-2 border-green-400/60 rounded-full bg-black/30"
          style={{ 
            width: radarSize, 
            height: radarSize,
            boxShadow: 'inset 0 0 40px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.3)'
          }}
        >
          {/* 固定同心圓參考線 */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <div
              key={ratio}
              className="absolute border border-green-400/30 rounded-full"
              style={{
                width: `${ratio * 100}%`,
                height: `${ratio * 100}%`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* 距離標籤 - 基於動態半徑計算位置 */}
          {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <div
              key={ratio}
              className="absolute text-green-400/60 text-xs font-mono"
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translateY(-${ratio * radarMaxRadiusPx}px)`
              }}
            >
              {(ratio * RADAR_MAX_DISTANCE_KM).toFixed(1)}km
            </div>
          ))}

          {/* 當前掃描波紋 */}
          <div
            className="absolute border-2 border-green-400 rounded-full"
            style={{
              width: currentScanRadius * 2,
              height: currentScanRadius * 2,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.8
            }}
          />
          
          {/* 中心使用者位置 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <motion.div
              className="w-4 h-4 bg-blue-400 rounded-full border-2 border-white"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.8, 1, 0.8]
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

          {/* 被掃描到的可用停車位 */}
          {scannedAvailableSpots.map(spot => (
            <motion.div
              key={`radar-${spot!.parkId}`}
              className="absolute z-30"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${spot!.radarPosition.x}px, ${spot!.radarPosition.y}px)`
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1], 
                opacity: [0, 1, 0.9]
              }}
              transition={{ 
                duration: 0.6,
                ease: 'backOut'
              }}
            >
              <div className="relative">
                <div 
                  className="w-3 h-3 bg-green-400 rounded-full border border-white"
                  style={{
                    boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                  }}
                />
                {/* 停車位數量標籤 */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-green-400 text-xs px-1 py-0.5 rounded font-mono whitespace-nowrap">
                  {spot!.carRemainderNum}位
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* HUD 資訊面板 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-green-400 z-30 border border-green-400/40">
        <div className="flex justify-between items-start text-sm">
          <div className="space-y-1">
            <div className="font-mono text-base">🎯 PARKING RADAR</div>
            <div className="font-mono">掃描範圍: {RADAR_MAX_DISTANCE_KM}km</div>
            <div className="font-mono">
              可用車位: {scannedAvailableSpots.reduce((sum, spot) => sum + spot!.carRemainderNum, 0)} 個
            </div>
            <div className="text-xs opacity-70 font-mono">
              掃描進度: {((currentScanRadius / radarMaxRadiusPx) * 100).toFixed(0)}%
            </div>
            <div className="text-xs opacity-70 font-mono">
              雷達尺寸: {radarSize.toFixed(0)}px
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <div className="font-mono text-xs">📍 用戶位置</div>
            <div className="font-mono text-xs">{mapCenter[0].toFixed(5)}</div>
            <div className="font-mono text-xs">{mapCenter[1].toFixed(5)}</div>
            <div className="text-xs opacity-70 font-mono">
              總停車格: {parkingData?.length || 0} 個
            </div>
            <div className="text-xs opacity-70 font-mono">
              已掃描: {scannedParkingIds.size} 個
            </div>
            <div className="flex items-center justify-end mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs font-mono">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMode;
