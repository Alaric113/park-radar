// src/components/Map/MapContainer.tsx
import React from 'react';
import { MapContainer as RLMap, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修復 Leaflet 預設圖標
(L.Icon.Default.prototype as any)._getIconUrl && delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  center: LatLngExpression;
  zoom: number;
}

const MapContainer: React.FC<MapProps> = ({ center, zoom }) => {
  return (
    <div  style={{height:'70vh',  width: '100vw' }}>
      <RLMap
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          

          
          url= "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
        <Marker position={center}>
          <Popup>你的位置 📍</Popup>
        </Marker>
      </RLMap>
    </div>
  );
};

export default MapContainer;
