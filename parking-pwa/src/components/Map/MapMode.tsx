// src/components/Map/MapMode.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapContainer from './MapContainer';
import { useGeolocation } from '../../hooks/useGeolocation';

interface ParkingLot {
  parkId: string;
  parkName: string;
  lat: number;
  lon: number;
  carRemainderNum: number;
  carTotalNum: number;
  remark: string;
  wkt?: string;
}

const MapMode: React.FC = () => {
  const { location, error, loading: locationLoading } = useGeolocation();
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.0478, 121.5170]);
  const [parkingData, setParkingData] = useState<ParkingLot[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const lastRequestCenter = useRef<[number, number]>([25.0478, 121.5170]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRequestingRef = useRef(false);
  const currentMapCenter = useRef<[number, number]>([25.0478, 121.5170]);

  // 更新當前地圖中心 ref
  useEffect(() => {
    currentMapCenter.current = mapCenter;
    console.log('地圖中心更新為:', mapCenter);
  }, [mapCenter]);

  // 計算兩點間距離
  const getDistance = useCallback(([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number => {
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

  // API 呼叫函數
  const fetchParkingData = useCallback(async (center: [number, number], reason = 'manual') => {
    if (isRequestingRef.current) {
      console.log('請求進行中，跳過此次請求');
      return;
    }
    
    isRequestingRef.current = true;
    setApiLoading(true);
    
    try {
      console.log(`正在查詢停車場 (${reason}): ${center[0].toFixed(4)}, ${center[1].toFixed(4)}`);
      
      const response = await fetch(
        `/.netlify/functions/parks?lat=${center[0]}&lon=${center[1]}&type=car&radius=5`
      );
      const result = await response.json();
      
      if (result.ok && result.data) {
        setParkingData(result.data);
        lastRequestCenter.current = center;
        setLastUpdated(new Date());
        console.log(`停車場資料更新 (${reason}): ${result.data.length} 筆`);
      } else {
        console.error('API 錯誤:', result);
      }
    } catch (error) {
      console.error('獲取停車場資料失敗:', error);
    } finally {
      setApiLoading(false);
      isRequestingRef.current = false;
    }
  }, []);

  // 當使用者位置變化時，更新地圖中心
  useEffect(() => {
    if (location) {
      const newCenter: [number, number] = [location.latitude, location.longitude];
      console.log('使用者位置變化，更新地圖中心:', newCenter);
      setMapCenter(newCenter);
    }
  }, [location]);

  // 地圖移動回調函數
  const handleMapMoved = useCallback((newCenter: [number, number]) => {
    console.log('地圖手動移動到:', newCenter);
    setMapCenter(newCenter);
  }, []);

  // 監聽地圖中心變化，當移動超過閾值時觸發 API 請求
  useEffect(() => {
    if (!mapCenter) return;
    
    const distanceMoved = getDistance(mapCenter, lastRequestCenter.current);
    const THRESHOLD_DISTANCE = 300;
    
    console.log(`地圖移動距離檢查: ${Math.round(distanceMoved)}公尺 (閾值: ${THRESHOLD_DISTANCE}公尺)`);
    
    if (distanceMoved > THRESHOLD_DISTANCE) {
      console.log('🚀 超過移動閾值，請求新的停車場資料...');
      fetchParkingData(mapCenter, 'location_change');
    }
  }, [mapCenter[0], mapCenter[1], getDistance, fetchParkingData]);

  // 初始載入和定時更新 - 只執行一次
  useEffect(() => {
    console.log('🎯 MapMode 組件掛載，設置定時更新');
    
    // 初始載入
    fetchParkingData(mapCenter, 'initial');
    
    // 設置定時器 - 每10秒更新，使用 ref 中的最新地圖中心
    intervalRef.current = setInterval(() => {
      const currentCenter = currentMapCenter.current;
      console.log('⏰ 地圖模式定時更新觸發，使用座標:', currentCenter);
      fetchParkingData(currentCenter, 'interval');
    }, 10000);

    // 清理定時器
    return () => {
      if (intervalRef.current) {
        console.log('🧹 MapMode 組件卸載，清理定時器');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // 空依賴陣列，只執行一次

  // 手動重新整理功能
  const handleRefresh = () => {
    console.log('🔄 手動重新整理');
    fetchParkingData(mapCenter, 'manual_refresh');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              📍 地圖中心: {mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}
            </span>
            <span className="text-gray-500">
              停車場: {parkingData.length} 個
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={apiLoading}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              🔄 重新整理
            </button>
            
            {locationLoading && (
              <span className="text-blue-600">🔍 定位中...</span>
            )}
            {apiLoading && (
              <span className="text-green-600">🔄 更新中...</span>
            )}
            {error && (
              <span className="text-red-600">❌ 定位失敗</span>
            )}
            {lastUpdated && (
              <span className="text-gray-400">
                更新: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          parkingData={parkingData}
          onMapMove={handleMapMoved}
        />
      </div>
    </div>
  );
};

export default MapMode;
