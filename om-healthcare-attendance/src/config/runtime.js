export const ADMIN_EMAIL = 'omheathcare24@gmail.com';

export const GPS_FOREGROUND_INTERVAL_MS = 3000;
export const GPS_BACKGROUND_INTERVAL_MS = 12000;
export const GPS_LOG_INTERVAL_MS = 5000;
export const GPS_RETRY_DELAY_MS = 4000;
export const GPS_JITTER_METERS = 8;
export const GPS_MOVING_METERS = 10;
export const GPS_BUFFER_IN_METERS = 95;
export const GPS_BUFFER_OUT_METERS = 105;
export const GPS_MAX_ACCURACY_METERS = 60;
export const GPS_LOW_ACCURACY_FALLBACK_METERS = 120;
export const GPS_MAX_JUMP_METERS = 1000;
export const GPS_MAX_JUMP_WINDOW_MS = 120000;

const provider = (import.meta.env.VITE_MAP_PROVIDER || 'carto-dark').toLowerCase();
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
const mapboxStyleId = import.meta.env.VITE_MAPBOX_STYLE_ID || 'mapbox/dark-v11';

const providerConfig = {
  osm: {
    name: 'OpenStreetMap',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  'carto-dark': {
    name: 'CARTO Dark',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
  },
  mapbox: mapboxToken
    ? {
        name: 'Mapbox',
        tileUrl: `https://api.mapbox.com/styles/v1/${mapboxStyleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
      }
    : null,
};

export const MAP_PROVIDER = providerConfig[provider] ? provider : 'carto-dark';
export const MAP_CONFIG = providerConfig[MAP_PROVIDER] || providerConfig['carto-dark'];

export const isSecureContextRequired = () => {
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

export const shouldRedirectToHttps = () =>
  typeof window !== 'undefined' &&
  window.location.protocol === 'http:' &&
  isSecureContextRequired();
