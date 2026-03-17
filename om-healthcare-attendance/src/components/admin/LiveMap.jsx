import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SHOP_LAT, SHOP_LNG, ALLOWED_RADIUS_METERS } from '../../firebase/config';
import { MAP_CONFIG, MAP_PROVIDER } from '../../config/runtime';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const icons = {
  store: createIcon('blue'),
  in_zone: createIcon('green'),
  out_of_zone: createIcon('red'),
  unknown: createIcon('grey')
};

const SmoothStaffMarker = ({ record, icon }) => {
  const markerRef = useRef(null);
  const previousPositionRef = useRef([record.lastCoords.lat, record.lastCoords.lon]);
  const nextPosition = [record.lastCoords.lat, record.lastCoords.lon];

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) {
      previousPositionRef.current = nextPosition;
      return undefined;
    }

    const previousPosition = previousPositionRef.current;
    if (previousPosition[0] === nextPosition[0] && previousPosition[1] === nextPosition[1]) {
      return undefined;
    }

    let frameId = null;
    const start = performance.now();
    const duration = 800;

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const lat = previousPosition[0] + (nextPosition[0] - previousPosition[0]) * progress;
      const lon = previousPosition[1] + (nextPosition[1] - previousPosition[1]) * progress;
      marker.setLatLng([lat, lon]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        previousPositionRef.current = nextPosition;
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [record.lastCoords.lat, record.lastCoords.lon]);

  return (
    <Marker ref={markerRef} position={nextPosition} icon={icon}>
      <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
        <span className="font-semibold capitalize">{record.staffName}</span>
      </Tooltip>
      <Popup>
        <strong className="capitalize">{record.staffName}</strong><br/>
        <span>Status: {record.zoneStatus === 'in_zone' ? 'In Range' : record.zoneStatus === 'out_of_zone' ? 'Out of Range' : 'GPS Pending'}</span><br/>
        <span>Distance: {record.distanceMeters ?? '--'}m</span><br/>
        <span>Movement: {record.movementStatus || 'Idle'}</span><br/>
        <span>Accuracy: {record.gpsAccuracyMeters ?? '--'}m</span>
      </Popup>
    </Marker>
  );
};

const LiveMap = ({ records }) => {
  const shopCenter = [SHOP_LAT, SHOP_LNG];
  const activeRecords = records?.filter(r => r.lastCoords && r.status !== 'Absent') || [];

  return (
    <div className="bg-card/90 mt-6 overflow-hidden flex flex-col rounded-4xl border border-white/5 shadow-panel">
      <div className="p-5 border-b border-white/5 flex flex-col gap-3 md:flex-row md:justify-between md:items-center bg-cardHover/40">
        <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
           🗺️ Live Staff Tracking Map
        </h3>
        <div className="flex flex-wrap gap-4 text-xs font-medium">
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green"></div> In Zone</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red"></div> Out of Range</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Waiting for GPS</span>
           <span className="rounded-full border border-white/5 bg-card/70 px-3 py-1 uppercase tracking-[0.18em] text-[10px] text-textSecondary">{MAP_PROVIDER}</span>
           <span className="rounded-full border border-white/5 bg-primary/60 px-3 py-1 uppercase tracking-[0.18em] text-[10px] text-textSecondary">{activeRecords.length} active staff</span>
        </div>
      </div>
      <div className="h-[320px] w-full z-0 sm:h-[380px] lg:h-[420px]">
        <MapContainer center={shopCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution={MAP_CONFIG.attribution}
            url={MAP_CONFIG.tileUrl}
          />
          
          <Circle 
            center={shopCenter} 
            radius={ALLOWED_RADIUS_METERS} 
            pathOptions={{ color: '#3FB950', fillColor: '#3FB950', fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }} 
          />
          
          <Marker position={shopCenter} icon={icons.store}>
            <Popup><strong>OM Health Care</strong><br/>Store Location</Popup>
          </Marker>

          {activeRecords.map(record => {
            const iconType = record.zoneStatus === 'out_of_zone' ? 'out_of_zone' : (record.zoneStatus === 'in_zone' ? 'in_zone' : 'unknown');
            
            return (
              <SmoothStaffMarker key={record.id} record={record} icon={icons[iconType]} />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveMap;
