// src/components/Map/MapMode.tsx
import React from 'react';
import MapContainer from './MapContainer';
import { useGeolocation } from '../../hooks/useGeolocation';

const MapMode: React.FC = () => {
  const { location, error, loading } = useGeolocation();
  
  // 預設位置 (台北車站)
  const defaultCenter: [number, number] = [25.0478, 121.5170];
  const center = location 
    ? [location.latitude, location.longitude] as [number, number]
    : defaultCenter;

  return (
    <div className="h-full flex flex-col">
      {/* 狀態資訊欄 */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {location ? "📍 當前位置" : "📍 預設位置"}
          </span>
          {loading && (
            <span className="text-sm text-blue-600">正在定位中...</span>
          )}
          {error && (
            <span className="text-sm text-red-600">定位失敗</span>
          )}
        </div>
      </div>
      
      {/* 地圖容器 */}
      <div className="flex-1">
        <MapContainer center={center} zoom={16} />
      </div>
    </div>
  );
};

export default MapMode;
