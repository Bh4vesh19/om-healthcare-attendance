import React, { useState, useEffect } from 'react';
import { getShiftWindowStatus, parseTimeToMinutes, getCurrentTime } from '../../utils/shiftHelper';

const ShiftCard = ({
    sessionData,
    attendanceRecord,
    loadingAttendance,
    gpsState,
    onCheckIn,
    onCheckOut
}) => {
    const [currentTimeInt, setCurrentTimeInt] = useState(parseTimeToMinutes(getCurrentTime()));
    
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTimeInt(parseTimeToMinutes(getCurrentTime()));
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    if (loadingAttendance) {
        return <div className="card w-full p-6 animate-pulse text-center text-textSecondary h-40 flex items-center justify-center">Loading Shift Data...</div>;
    }

    const startMins = parseTimeToMinutes(sessionData?.shiftStart || '09:00');
    let endMins = parseTimeToMinutes(sessionData?.shiftEnd || '18:00');
    if (endMins < startMins) endMins += 1440; // Overnight
    
    let currentMins = currentTimeInt;
    if (endMins > 1440 && currentMins < startMins) currentMins += 1440;

    const shiftDuration = endMins - startMins;
    const shiftElapsed = Math.max(0, currentMins - startMins);
    let progressPercent = (shiftElapsed / shiftDuration) * 100;
    progressPercent = Math.min(Math.max(progressPercent, 0), 100);

    const { canCheckIn, reason } = getShiftWindowStatus(sessionData);
    const hasCheckedIn = attendanceRecord && attendanceRecord.checkIn;
    const hasCheckedOut = attendanceRecord && attendanceRecord.checkOut;
    const isAbsent = attendanceRecord && attendanceRecord.status === 'Absent';
    
    const canPerformGPSAction = gpsState.isWithinRange && !gpsState.loading && !gpsState.error;
    const outOfRangeMessage = !gpsState.loading && !gpsState.isWithinRange
        ? 'You must be within 100 meters to check in'
        : null;
    
    const CheckInButton = () => {
        if (hasCheckedIn) {
            return (
                <div className="w-full flex flex-col gap-2 animate-fade-in">
                    <div className="flex items-center justify-center gap-2 text-green font-bold text-lg mb-2">
                        <span className="text-xl">✅</span>
                        Checked in at {attendanceRecord.checkIn}
                    </div>
                    {!hasCheckedOut && (
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={onCheckOut} 
                                disabled={!canPerformGPSAction}
                                className="btn btn-blue w-full h-[52px]"
                            >
                                {!canPerformGPSAction ? 'OUT OF ZONE' : 'CHECK OUT'}
                            </button>
                            {!canPerformGPSAction && outOfRangeMessage && (
                                <p className="text-center text-sm font-medium text-amber">{outOfRangeMessage}</p>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (isAbsent) {
            return (
                 <div className="w-full text-center text-red font-bold text-lg p-4 bg-red/10 border border-red/20 rounded-lg">
                     Marked Absent for Today
                 </div>
            );
        }

        if (reason === 'too-early') {
            const minsToWait = startMins - currentMins;
            const h = Math.floor(minsToWait / 60);
            const m = minsToWait % 60;
            return (
                <button disabled className="btn btn-outline w-full h-[52px] cursor-not-allowed opacity-50 relative">
                     <span className="absolute left-4">🔒</span>
                     Check-in opens in {h > 0 ? `${h}h ` : ''}{m}m
                </button>
            );
        }

        if (reason === 'shift-ended') {
            return (
                <button disabled className="btn btn-outline w-full h-[52px] cursor-not-allowed opacity-50">
                     Shift Window Closed
                </button>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                <button 
                    onClick={onCheckIn} 
                    disabled={!canPerformGPSAction}
                    className={`btn w-full h-[52px] relative overflow-hidden transition-all duration-300 ${!canPerformGPSAction ? 'btn-outline opacity-50' : 'bg-amber text-primary hover:bg-opacity-90 shadow-[0_0_15px_rgba(210,153,34,0.4)]'}`}
                >
                    {!canPerformGPSAction ? 'OUT OF ZONE' : 'CHECK IN NOW'}
                    {canPerformGPSAction && <div className="absolute inset-0 bg-white/20 blur-md animate-pulse"></div>}
                </button>
                {!canPerformGPSAction && outOfRangeMessage && (
                    <p className="text-center text-sm font-medium text-amber">{outOfRangeMessage}</p>
                )}
            </div>
        );
    };

    return (
        <div className="card w-full p-6 flex flex-col gap-6 relative overflow-hidden">
             {/* Progress Bar Background */}
             <div 
                 className="absolute top-0 left-0 h-1 bg-amber/50 transition-all duration-1000" 
                 style={{ width: `${progressPercent}%` }}
             ></div>

             <div className="flex justify-between items-center pb-4 border-b border-border text-textSecondary font-medium">
                 <div className="flex flex-col gap-1">
                     <span className="text-[10px] uppercase tracking-wide">Shift Start</span>
                     <span className="text-textPrimary text-lg font-bold">{sessionData?.shiftStart || '09:00'}</span>
                 </div>
                 <span className="text-2xl text-border">&rarr;</span>
                 <div className="flex flex-col gap-1 text-right">
                     <span className="text-[10px] uppercase tracking-wide">Shift End</span>
                     <span className="text-textPrimary text-lg font-bold">{sessionData?.shiftEnd || '18:00'}</span>
                 </div>
             </div>

             <CheckInButton />
        </div>
    );
};

export default ShiftCard;
