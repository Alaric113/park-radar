// src/components/Map/MapContainer.tsx
import React from "react";
import {
  MapContainer as RLMap,
  TileLayer,
  Marker,
  Popup,
  Polygon,
} from "react-leaflet";
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
  parkingData: Array<ParkingLot>;
}

const getColorByAvailability = (remark: string) => {
  if (remark === "") return "#6B7280"; // 灰色 - 無資料

  if (remark === "目前有車停放") return "#EF4444"; // 紅色 - 幾乎滿了

  return "#10B981"; // 綠色 - 充足
};

const MapContainer: React.FC<MapProps> = ({ center, zoom, parkingData }) => {
  return (
    <div style={{ height: "70vh", width: "100vw" }}>
      <RLMap
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" />
        <Marker position={center}>
          <Popup>你的位置 📍</Popup>
        </Marker>
        {parkingData?.map((lot) => {
          // 如果有 WKT 資料，顯示多邊形
          if (lot.wkt) {
            try {
              // 解析 WKT 格式：POLYGON ((121.578247582053 25.0409150895367, ...))
              const coordsMatch = lot.wkt.match(
                /POLYGON\s*\(\s*\((.*?)\)\s*\)/
              );
              if (coordsMatch) {
                const coordsStr = coordsMatch[1];
                const coordinates = coordsStr.split(",").map((pair) => {
                  const [lon, lat] = pair.trim().split(" ").map(Number);
                  return [lat, lon] as [number, number]; // Leaflet 用 [lat, lon] 格式
                });

                return (
                  <Polygon
                    key={`polygon-${lot.parkId}`}
                    positions={coordinates}
                    pathOptions={{
                      color: getColorByAvailability(lot.remark), // 藍色邊框
                      weight: 2,
                      opacity: 0.8,
                      fillColor: getColorByAvailability(lot.remark),
                      fillOpacity: 0.3,
                    }}
                  >
                    <Popup>
                      <div>
                        <h4>{lot.parkName}</h4>
                        <p>服務時間: {lot.servicetime}</p>
                        <p>收費: {lot.payex}</p>
                        <p>剩餘車位: {lot.remark}</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
            } catch (error) {
              console.error("解析 WKT 失敗:", error);
            }
          }
          return null;
        })}
      </RLMap>
    </div>
  );
};

export default MapContainer;
