export const getCurrentDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const getCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

export const formatMinutesToDisplay = (mins) => {
    if (mins <= 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

// Returns { canCheckIn: boolean, reason: string }
export const getShiftWindowStatus = (sessionData) => {
    if (!sessionData) return { canCheckIn: false, reason: 'no-session' };
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    // Default 09:00 to 18:00 if not set
    const shiftStart = sessionData.shiftStart || '09:00';
    const shiftEnd = sessionData.shiftEnd || '18:00';
    
    const startMins = parseTimeToMinutes(shiftStart);
    let endMins = parseTimeToMinutes(shiftEnd);
    
    // Handle overnight shifts (e.g. 19:00 to 07:00)
    let isOvernight = false;
    if (endMins < startMins) {
        endMins += 1440;
        isOvernight = true;
    }
    
    let effectiveCurrent = currentMins;
    if (isOvernight && currentMins < startMins) {
        effectiveCurrent += 1440;
    }

    if (effectiveCurrent < startMins) {
        return { canCheckIn: false, reason: 'too-early' };
    }
    if (effectiveCurrent > endMins) {
        return { canCheckIn: false, reason: 'shift-ended' };
    }
    return { canCheckIn: true, reason: 'active' };
};

export const calcWorkingHours = (checkInTime, checkOutTime, dateStr) => {
    if (!checkInTime || checkInTime === '-') return '0.0h';
    const checkInDate = new Date(`${dateStr}T${checkInTime}:00`);
    let now = new Date();
    if (checkOutTime && checkOutTime !== '-' && checkOutTime !== null) {
      now = new Date(`${dateStr}T${checkOutTime}:00`);
    }
    const diffMins = Math.floor((now - checkInDate) / 60000);
    if (diffMins < 0) return '0.0h';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
};

export const formatSecondsToHours = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const hrs = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    return `${hrs}h ${mins}m`;
};
