import { useState, useEffect } from 'react';
import { startGPSHeartbeat } from '../firebase/gps';
import { SHOP_LAT, SHOP_LNG } from '../firebase/config';
import { getDistanceMeters } from '../utils/distanceCalculator';
import { shouldRedirectToHttps } from '../config/runtime';

export const useGPS = (sessionData, attendanceDocId, options = {}) => {
    const { testMode = false } = options;
    const [gpsState, setGpsState] = useState({
        latitude: null,
        longitude: null,
        distance: null,
        isWithinRange: false,
        movementStatus: 'Idle',
        zoneStatus: 'unknown',
        accuracy: null,
        inRangeWorkSeconds: 0,
        outOfRangeSeconds: 0,
        permissionState: 'prompt',
        isBackgrounded: false,
        warning: null,
        isSecureContext: !shouldRedirectToHttps(),
        error: null,
        loading: true
    });

    useEffect(() => {
        if (!sessionData || !sessionData.docId) {
            setGpsState(prev => ({ ...prev, loading: false }));
            return;
        }

        if (testMode) {
            let step = 0;
            const interval = setInterval(() => {
                step += 1;
                const latitude = SHOP_LAT + Math.sin(step / 4) * 0.00025;
                const longitude = SHOP_LNG + Math.cos(step / 4) * 0.00025;
                const distance = getDistanceMeters(latitude, longitude, SHOP_LAT, SHOP_LNG);
                const zoneStatus = distance <= 100 ? 'in_zone' : 'out_of_zone';

                setGpsState((prev) => ({
                    ...prev,
                    latitude,
                    longitude,
                    distance,
                    isWithinRange: zoneStatus === 'in_zone',
                    zoneStatus,
                    movementStatus: 'Moving',
                    accuracy: 6,
                    warning: 'Test Mode is enabled. Simulated movement is active.',
                    error: null,
                    loading: false
                }));
            }, 2500);

            return () => clearInterval(interval);
        }

        const unwatch = startGPSHeartbeat(sessionData.docId, attendanceDocId, (newState) => {
            setGpsState({ ...newState, loading: false });
        });

        return () => {
            if (unwatch) unwatch();
        };
    }, [sessionData, attendanceDocId, testMode]);

    return gpsState;
};
