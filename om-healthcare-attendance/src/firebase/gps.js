import { db, SHOP_LAT, SHOP_LNG } from './config';
import { getDistanceMeters } from '../utils/distanceCalculator';
import { doc, updateDoc, serverTimestamp, getDoc, collection, addDoc } from 'firebase/firestore';
import {
    GPS_BACKGROUND_INTERVAL_MS,
    GPS_BUFFER_IN_METERS,
    GPS_BUFFER_OUT_METERS,
    GPS_FOREGROUND_INTERVAL_MS,
    GPS_JITTER_METERS,
    GPS_LOG_INTERVAL_MS,
    GPS_LOW_ACCURACY_FALLBACK_METERS,
    GPS_MAX_ACCURACY_METERS,
    GPS_MAX_JUMP_METERS,
    GPS_MAX_JUMP_WINDOW_MS,
    GPS_MOVING_METERS,
    GPS_RETRY_DELAY_MS
} from '../config/runtime';

const isValidCoordinate = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const resolveZoneStatus = (distance, previousZone = null) => {
    if (distance <= GPS_BUFFER_IN_METERS) return 'in_zone';
    if (distance >= GPS_BUFFER_OUT_METERS) return 'out_of_zone';
    if (previousZone === 'in_zone' || previousZone === 'out_of_zone') return previousZone;
    return distance <= 100 ? 'in_zone' : 'out_of_zone';
};

export const startGPSHeartbeat = (staffDocId, docId, callback) => {
    let watchId = null;
    let syncInterval = null;
    let lastKnownState = null;
    let lastPersistedAtMs = 0;
    let lastLoggedAtMs = 0;
    let cachedRecord = null;
    let retryTimer = null;
    let permissionState = 'prompt';
    let isBackgrounded = document.hidden;

    const emitState = (state) => {
        if (!callback) return;
        callback({
            ...state,
            permissionState,
            isBackgrounded,
            loading: false
        });
    };

    const updateSyncInterval = () => {
        if (syncInterval) clearInterval(syncInterval);
        if (!docId) return;
        syncInterval = setInterval(() => {
            persistState(false);
        }, isBackgrounded ? GPS_BACKGROUND_INTERVAL_MS : GPS_FOREGROUND_INTERVAL_MS);
    };

    const loadCurrentRecord = async (force = false) => {
        if (!docId) return null;
        if (cachedRecord && !force) return cachedRecord;

        const snap = await getDoc(doc(db, 'attendance', docId));
        if (!snap.exists()) return null;
        cachedRecord = snap.data();
        return cachedRecord;
    };

    const persistState = async (forceLog = false) => {
        if (!docId || !lastKnownState) return;
        try {
            const docRef = doc(db, 'attendance', docId);
            const current = await loadCurrentRecord();
            if (!current) return;
            if (!current.checkIn || current.checkOut || current.status === 'Absent') return;

            const nowMs = Date.now();
            const previousUpdateMs = Number(current.trackingUpdatedAtMs || nowMs);
            const deltaSeconds = Math.max(0, Math.floor((nowMs - previousUpdateMs) / 1000));
            const previousZone = current.zoneStatus || 'in_zone';

            const inRangeWorkSeconds = Number(current.inRangeWorkSeconds || 0) + (previousZone === 'in_zone' ? deltaSeconds : 0);
            const outOfRangeSeconds = Number(current.outOfRangeSeconds || 0) + (previousZone === 'out_of_zone' ? deltaSeconds : 0);

            const prevCoords = current.lastCoords;
            const distanceDelta = prevCoords
                ? getDistanceMeters(prevCoords.lat, prevCoords.lon, lastKnownState.latitude, lastKnownState.longitude)
                : 0;
            const movementStatus = distanceDelta >= GPS_MOVING_METERS ? 'Moving' : 'Idle';

            if (distanceDelta > GPS_MAX_JUMP_METERS && nowMs - previousUpdateMs <= GPS_MAX_JUMP_WINDOW_MS) {
                emitState({
                    ...lastKnownState,
                    warning: 'Large GPS jump ignored. Waiting for a stable reading.',
                    error: null
                });
                return;
            }

            const nextZone = lastKnownState.zoneStatus || (lastKnownState.isWithinRange ? 'in_zone' : 'out_of_zone');
            const payload = {
                zoneStatus: nextZone,
                gpsFlagged: nextZone === 'out_of_zone',
                distanceMeters: Math.round(lastKnownState.distance),
                movementStatus,
                gpsAccuracyMeters: Math.round(lastKnownState.accuracy || 0),
                lastCoords: { lat: lastKnownState.latitude, lon: lastKnownState.longitude },
                lastGpsCheck: serverTimestamp(),
                lastGpsUpdate: serverTimestamp(),
                lastSeenAt: serverTimestamp(),
                trackingUpdatedAtMs: nowMs,
                trackingMode: isBackgrounded ? 'background' : 'foreground',
                inRangeWorkSeconds,
                outOfRangeSeconds,
                totalHours: parseFloat((inRangeWorkSeconds / 3600).toFixed(2)),
                totalOutMins: parseFloat((outOfRangeSeconds / 60).toFixed(1))
            };

            if (current.zoneStatus !== nextZone) {
                payload.zoneTransitionAt = serverTimestamp();
                if (nextZone === 'in_zone') {
                    payload.lastZoneEntryAt = serverTimestamp();
                } else {
                    payload.lastZoneExitAt = serverTimestamp();
                }
            }

            await updateDoc(docRef, payload);
            cachedRecord = { ...current, ...payload, zoneStatus: nextZone, movementStatus };
            lastPersistedAtMs = nowMs;

            if (forceLog || !lastLoggedAtMs || nowMs - lastLoggedAtMs >= GPS_LOG_INTERVAL_MS || current.zoneStatus !== nextZone || current.movementStatus !== movementStatus) {
                await addDoc(collection(db, 'attendance', docId, 'locationLogs'), {
                    staffDocId,
                    latitude: lastKnownState.latitude,
                    longitude: lastKnownState.longitude,
                    distanceMeters: Math.round(lastKnownState.distance),
                    zoneStatus: nextZone,
                    movementStatus,
                    accuracyMeters: Math.round(lastKnownState.accuracy || 0),
                    trackingMode: isBackgrounded ? 'background' : 'foreground',
                    zoneTransition: current.zoneStatus !== nextZone,
                    createdAt: serverTimestamp(),
                    clientTimestampMs: nowMs
                });
                lastLoggedAtMs = nowMs;
            }

            emitState({
                ...lastKnownState,
                zoneStatus: nextZone,
                isWithinRange: nextZone === 'in_zone',
                movementStatus,
                inRangeWorkSeconds,
                outOfRangeSeconds,
                accuracy: Math.round(lastKnownState.accuracy || 0),
                warning: lastKnownState.warning || null,
                error: null
            });
        } catch (e) {
            console.error('GPS Heartbeat Error:', e);
            cachedRecord = null;
            emitState({ ...lastKnownState, error: e.message || 'GPS sync failed' });
        }
    };

    const scheduleRetry = () => {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
            navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }, GPS_RETRY_DELAY_MS);
    };

    const handlePosition = async (position) => {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        const { latitude, longitude, accuracy } = position.coords;
        if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
            emitState({
                ...lastKnownState,
                error: 'Invalid GPS coordinates received.',
                warning: 'Waiting for a stable location fix.'
            });
            return;
        }

        const rawDistance = getDistanceMeters(latitude, longitude, SHOP_LAT, SHOP_LNG);
        const previousZone = lastKnownState?.zoneStatus || null;
        const positionDelta = lastKnownState
            ? getDistanceMeters(lastKnownState.latitude, lastKnownState.longitude, latitude, longitude)
            : 0;
        const jitterSuppressed = lastKnownState && positionDelta <= GPS_JITTER_METERS && previousZone === resolveZoneStatus(rawDistance, previousZone);
        const lowAccuracyFallback = lastKnownState && accuracy > GPS_LOW_ACCURACY_FALLBACK_METERS;

        const stabilizedLatitude = lowAccuracyFallback || jitterSuppressed ? lastKnownState.latitude : latitude;
        const stabilizedLongitude = lowAccuracyFallback || jitterSuppressed ? lastKnownState.longitude : longitude;
        const stabilizedDistance = lowAccuracyFallback || jitterSuppressed ? lastKnownState.distance : rawDistance;
        const zoneStatus = resolveZoneStatus(stabilizedDistance, previousZone);
        const movementStatus = positionDelta >= GPS_MOVING_METERS ? 'Moving' : 'Idle';
        const warning = lowAccuracyFallback
            ? 'Low GPS accuracy. Using the last stable location.'
            : accuracy > GPS_MAX_ACCURACY_METERS
                ? 'GPS accuracy is weak. Move near open sky for better tracking.'
                : isBackgrounded
                    ? 'Location tracking may pause in background.'
                    : null;

        lastKnownState = {
            latitude: stabilizedLatitude,
            longitude: stabilizedLongitude,
            distance: stabilizedDistance,
            zoneStatus,
            isWithinRange: zoneStatus === 'in_zone',
            accuracy,
            movementStatus,
            warning,
            jitterSuppressed
        };

        emitState({ ...lastKnownState, error: null });
        if (!lastPersistedAtMs || Date.now() - lastPersistedAtMs >= GPS_FOREGROUND_INTERVAL_MS - 500) {
            await persistState(false);
        }
    };

    const handleError = (error) => {
        if (error?.code === 1) permissionState = 'denied';
        emitState({
            ...lastKnownState,
            error: error?.code === 1 ? 'Location permission denied. Enable GPS access to continue tracking.' : error.message,
            warning: isBackgrounded ? 'Location tracking may pause in background.' : null,
            isWithinRange: lastKnownState?.isWithinRange ?? false,
            distance: lastKnownState?.distance ?? null
        });
        scheduleRetry();
    };

    const handleVisibilityChange = () => {
        isBackgrounded = document.hidden;
        updateSyncInterval();
        if (!isBackgrounded && lastKnownState) {
            persistState(false);
        } else if (lastKnownState) {
            emitState({
                ...lastKnownState,
                warning: 'Location tracking may pause in background.',
                error: null
            });
        }
    };

    if ("geolocation" in navigator) {
        if (navigator.permissions?.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((status) => {
                permissionState = status.state;
                status.onchange = () => {
                    permissionState = status.state;
                    emitState({
                        ...lastKnownState,
                        warning: permissionState === 'denied' ? null : lastKnownState?.warning || null,
                        error: permissionState === 'denied' ? 'Location permission denied. Enable GPS access to continue tracking.' : lastKnownState?.error || null,
                        isWithinRange: lastKnownState?.isWithinRange ?? false,
                        distance: lastKnownState?.distance ?? null
                    });
                };
            }).catch(() => {});
        }

        watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        updateSyncInterval();
    } else {
        emitState({ error: "Geolocation not supported", isWithinRange: false });
    }

    return () => {
        if (lastKnownState) {
            persistState(true);
        }
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (syncInterval) clearInterval(syncInterval);
        if (retryTimer) clearTimeout(retryTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
};
