// Silent GPS Tracking Service
// This script provides a background check that doesn't alert the user
// It uses hardcoded SHOP_LAT, SHOP_LNG from firebase-config.js

let gpsWatchId = null;
let GPS_OPTIONS = {
  enableHighAccuracy: false, // Default to false for better performance on low-end devices
  timeout: 10000,
  maximumAge: 1000
};

/**
 * Toggles GPS accuracy. Use high accuracy for critical verification (check-in/out).
 */
function setGpsAccuracy(high) {
  GPS_OPTIONS.enableHighAccuracy = !!high;
}

/**
 * Starts continuous GPS tracking and updates Firestore with zone status.
 * @param {string} attendanceDocId - The Firestore document ID for today's attendance.
 */
async function startContinuousGpsTracking(attendanceDocId) {
  if (!navigator.geolocation) {
    console.error("Geolocation not supported");
    return;
  }

  // Clear any existing watch
  stopGpsTracking();

  gpsWatchId = navigator.geolocation.watchPosition(
    async position => {
      const { latitude, longitude } = position.coords;
      const distance = getDistanceMeters(latitude, longitude, SHOP_LAT, SHOP_LNG);
      
      let newZoneStatus = "unknown";
      if (distance <= ALLOWED_RADIUS_METERS) {
        newZoneStatus = "in_zone";
      } else {
        newZoneStatus = "out_of_zone";
      }

      try {
        const docRef = db.collection("attendance").doc(attendanceDocId);
        const doc = await docRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        
        const oldZoneStatus = data.zoneStatus || "unknown";
        let outOfZoneSeconds = data.outOfZoneSeconds || 0;
        let outOfZoneStart = data.outOfZoneStart || null;

        // Logic for OUT TIME tracking
        if (oldZoneStatus === "in_zone" && newZoneStatus === "out_of_zone") {
          // Entering Out of Zone
          outOfZoneStart = Date.now();
        } else if (oldZoneStatus === "out_of_zone" && newZoneStatus === "in_zone") {
          // Returning to Zone
          if (outOfZoneStart) {
            const durationMs = Date.now() - outOfZoneStart;
            outOfZoneSeconds += Math.floor(durationMs / 1000);
            outOfZoneStart = null;
          }
        }

        await docRef.update({
          zoneStatus: newZoneStatus,
          lastCoords: { lat: latitude, lon: longitude },
          lastGpsUpdate: firebase.firestore.FieldValue.serverTimestamp(),
          outOfZoneSeconds: outOfZoneSeconds,
          outOfZoneStart: outOfZoneStart
        });
      } catch (err) {
        console.error("Failed to sync zone status:", err);
      }
    },
    async error => {
      console.error("GPS Watch Error:", error.message);
      try {
        const docRef = db.collection("attendance").doc(attendanceDocId);
        const doc = await docRef.get();
        if (!doc.exists) return;
        const data = doc.data();

        let outOfZoneSeconds = data.outOfZoneSeconds || 0;
        let outOfZoneStart = data.outOfZoneStart || null;

        // If we lose GPS while out, finalize the duration
        if (data.zoneStatus === "out_of_zone" && outOfZoneStart) {
          const durationMs = Date.now() - outOfZoneStart;
          outOfZoneSeconds += Math.floor(durationMs / 1000);
          outOfZoneStart = null;
        }

        await docRef.update({
          // Preserve the last known zone on transient GPS failures.
          zoneStatus: data.zoneStatus || "unknown",
          outOfZoneSeconds: outOfZoneSeconds,
          outOfZoneStart: outOfZoneStart,
          lastGpsError: error.message,
          lastGpsUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to update zone status to unknown:", err);
      }
    },
    GPS_OPTIONS
  );

  // Store the current Doc ID for stop/unload logic
  window.currentAttendanceDocId = attendanceDocId;
  window.addEventListener("beforeunload", stopGpsTracking);
}

async function stopGpsTracking() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    
    // Finalize OUT TIME if currently out
    if (window.currentAttendanceDocId) {
      try {
        const docRef = db.collection("attendance").doc(window.currentAttendanceDocId);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            if (data.zoneStatus === "out_of_zone" && data.outOfZoneStart) {
                const durationMs = Date.now() - data.outOfZoneStart;
                const newTotal = (data.outOfZoneSeconds || 0) + Math.floor(durationMs / 1000);
                await docRef.update({
                    outOfZoneSeconds: newTotal,
                    outOfZoneStart: null
                });
            }
        }
      } catch (e) { console.error("Finalize OUT TIME failed", e); }
    }

    window.removeEventListener("beforeunload", stopGpsTracking);
  }
}

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
    GPS_OPTIONS
  );
}

// Keep a minimal GPS object for backward compatibility
const GPS = {
  verifyWithinRange: function(requiredRadiusMeters = 100) {
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
        GPS_OPTIONS
      );
    });
  }
};
