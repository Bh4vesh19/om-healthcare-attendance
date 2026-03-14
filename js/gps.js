// Silent GPS Tracking Service
// This script provides a background check that doesn't alert the user
// It uses hardcoded SHOP_LAT, SHOP_LNG from firebase-config.js

async function checkStaffLocation(onResult) {
  if (!navigator.geolocation) {
    console.error("Geolocation not supported");
    onResult({ isWithinRange: false, error: "Geolocation not supported on this device." });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const distance = getDistanceMeters(
        position.coords.latitude, 
        position.coords.longitude,
        SHOP_LAT, 
        SHOP_LNG
      );
      
      const isWithinRange = distance <= ALLOWED_RADIUS_METERS;
      
      onResult({
        isWithinRange: isWithinRange,
        distance: Math.round(distance),
        coords: { lat: position.coords.latitude, lon: position.coords.longitude }
      });
    },
    error => {
      console.error("GPS Error:", error.message);
      onResult({ isWithinRange: false, error: error.message });
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// Keep a minimal GPS object for backward compatibility if any
const GPS = {
  verifyWithinRange: function(requiredRadiusMeters = 50) {
    return new Promise((resolve, reject) => {
      checkStaffLocation((res) => {
        if (res.error) {
          reject(new Error(`Unable to verify location: ${res.error}`));
          return;
        }

        if (!res.isWithinRange || res.distance > requiredRadiusMeters) {
          reject(new Error(`You must be within ${requiredRadiusMeters} meters of the store to mark attendance.`));
          return;
        }

        resolve(res);
      });
    });
  },
  getCoordinates: function() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        p => resolve({lat: p.coords.latitude, lon: p.coords.longitude}),
        e => reject(e),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
};
