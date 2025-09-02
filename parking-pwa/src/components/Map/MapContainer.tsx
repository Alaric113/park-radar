// src/components/Map/MapContainer.tsx
import React from "react";
import { MapContainer as RLMap, TileLayer, Marker, Popup, Polygon, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingLot } from "../../types/parking";

// 修復 Leaflet 預設圖標
(L.Icon.Default.prototype as any)._getIconUrl &&
  delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapProps {
  center: LatLngExpression;
  zoom: number;
  parkingData?: Array<ParkingLot>;
  onMapMove?: (center: [number, number]) => void;
}

// 地圖事件監聽組件
const MapEvents: React.FC<{ onMapMove?: (center: [number, number]) => void }> = ({ onMapMove }) => {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      onMapMove?.([center.lat, center.lng]);
    },
  });
  return null;
};

// 顏色函數
const getColorByAvailability = (remark: string, carRemainderNum?: number, carTotalNum?: number) => {
  if (!remark || remark === '') return '#6B7280'; // 灰色 - 無資料
  if (remark === '目前有車停放') return '#EF4444'; // 紅色 - 有車
  if (remark === '目前空格') return '#10B981'; // 綠色 - 空格
  
  // 額外邏輯：根據剩餘車位數量調整顏色
  if (carRemainderNum !== undefined && carTotalNum !== undefined && carTotalNum > 0) {
    const occupancyRate = 1 - (carRemainderNum / carTotalNum);
    if (occupancyRate >= 0.9) return '#EF4444'; // 紅色 - 90%以上滿
    if (occupancyRate >= 0.7) return '#F59E0B'; // 橘色 - 70-90%滿
    if (occupancyRate >= 0.3) return '#FCD34D'; // 黃色 - 30-70%滿
    return '#10B981'; // 綠色 - 30%以下滿
  }
  
  return '#F59E0B'; // 橘色 - 其他狀況
};

// 停車場詳細資訊 Popup
const ParkingPopup: React.FC<{ lot: ParkingLot }> = ({ lot }) => (
  <div className="min-w-48">
    <h4 className="font-bold text-lg mb-2">{lot.parkName}</h4>
    <div className="space-y-1 text-sm">
      <p><span className="font-medium">狀況:</span> {lot.remark || '無資料'}</p>
      <p><span className="font-medium">剩餘車位:</span> {lot.carRemainderNum}/{lot.carTotalNum}</p>
      {lot.servicetime && (
        <p><span className="font-medium">服務時間:</span> {lot.servicetime}</p>
      )}
      {lot.payex && (
        <p><span className="font-medium">收費:</span> {lot.payex}</p>
      )}
      <p className="text-gray-500 text-xs">
        座標: {lot.lat.toFixed(4)}, {lot.lon.toFixed(4)}
      </p>
    </div>
  </div>
);

const MapContainer: React.FC<MapProps> = ({ center, zoom, parkingData, onMapMove }) => {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <RLMap
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={true}
      >
        <TileLayer 
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution=''
        />
        
        {/* 地圖事件監聽 */}
        <MapEvents onMapMove={onMapMove} />
        
        {/* 地圖中心標記 */}
        <Marker position={center}>
          <Popup>
            <div className="text-center">
              <div className="text-lg mb-1">📍</div>
              <p className="font-medium">地圖中心</p>
              <p className="text-xs text-gray-500">
                {Array.isArray(center) 
                  ? `${center[0].toFixed(4)}, ${center[1].toFixed(4)}` 
                  : 'Loading...'}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* 渲染停車場 Polygons 和 Markers */}
        {parkingData?.map((lot) => {
          const color = getColorByAvailability(lot.remark, lot.carRemainderNum, lot.carTotalNum);
          
          // 如果有 WKT 資料，顯示多邊形
          if (lot.wkt) {
            try {
              const coordsMatch = lot.wkt.match(/POLYGON\s*\(\s*\((.*?)\)\s*\)/);
              if (coordsMatch) {
                const coordsStr = coordsMatch[1];
                const coordinates = coordsStr.split(',').map(pair => {
                  const [lon, lat] = pair.trim().split(' ').map(Number);
                  return [lat, lon] as [number, number];
                });
                
                return (
                  <Polygon
                    key={`polygon-${lot.parkId}`}
                    positions={coordinates}
                    pathOptions={{
                      color: color,
                      weight: 2,
                      opacity: 0.8,
                      fillColor: color,
                      fillOpacity: 0.4
                    }}
                  >
                    <Popup>
                      <ParkingPopup lot={lot} />
                    </Popup>
                  </Polygon>
                );
              }
            } catch (error) {
              console.error('解析 WKT 失敗:', lot.parkId, error);
            }
          }

          // 顯示點標記 (用於沒有多邊形資料的停車場或作為補充標記)
          return (
            <Marker 
              key={`marker-${lot.parkId}`}
              position={[lot.lat, lot.lon]}
              icon={L.divIcon({
                html: `<div style="
                  background-color: ${color}; 
                  width: 14px; 
                  height: 14px; 
                  border-radius: 50%; 
                  border: 2px solid white; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <span style="color: white; font-size: 8px; font-weight: bold;">
                    ${lot.carRemainderNum || 0}
                  </span>
                </div>`,
                className: 'custom-parking-marker',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            >
              <Popup>
                <ParkingPopup lot={lot} />
              </Popup>
            </Marker>
          );
        })}
      </RLMap>
    </div>
  );
};

export default MapContainer;
