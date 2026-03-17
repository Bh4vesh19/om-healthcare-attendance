import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useAttendance } from '../hooks/useAttendance';
import { useGPS } from '../hooks/useGPS';
import { useLiveClock } from '../hooks/useLiveClock';
import { checkIn, checkOut } from '../firebase/attendance';
import { parseTimeToMinutes, getCurrentTime, formatSecondsToHours } from '../utils/shiftHelper';

import Logo from '../components/common/Logo';
import ShiftCard from '../components/staff/ShiftCard';
import StatsRow from '../components/staff/StatsRow';
import ZoneBadge from '../components/staff/ZoneBadge';
import BottomNav from '../components/staff/BottomNav';
import ConfirmDialog from '../components/common/ConfirmDialog';
import RuntimeNotice from '../components/common/RuntimeNotice';
import TrackingDebugPanel from '../components/staff/TrackingDebugPanel';
import { shouldRedirectToHttps } from '../config/runtime';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { session } = useAuthContext();
    const { attendanceRecord, loading: loadingAttendance } = useAttendance(session?.docId);
    const { timeString, dateString } = useLiveClock(1000);
    const [testMode, setTestMode] = useState(false);
    
    // Pass strictly the docId of attendance record to the GPS hook if they are checked in
    const gpsState = useGPS(
        session,
        attendanceRecord?.checkIn && !attendanceRecord?.checkOut && attendanceRecord?.status !== 'Absent' ? attendanceRecord.id : null,
        { testMode }
    );
    
    const [actionLoading, setActionLoading] = useState(false);
    const [dialogConfig, setDialogConfig] = useState(null);
    const needsHttps = useMemo(() => shouldRedirectToHttps(), []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleCheckIn = () => {
        const currentMins = parseTimeToMinutes(getCurrentTime());
        const startMins = parseTimeToMinutes(session?.shiftStart || '09:00');
        const graceMins = session?.lateGraceMins || 15;
        const isLate = currentMins > (startMins + graceMins);

        setDialogConfig({
            title: "Confirm Check In",
            message: `Are you sure you want to check in now?${isLate ? " Note: You are checking in after your grace period and will be marked as Late." : ""}`,
            action: async () => {
                setActionLoading(true);
                try {
                    await checkIn(session, isLate);
                } catch(err) {
                    console.error("Check in error", err);
                    alert("Failed to check in. Check your connection.");
                }
                setActionLoading(false);
                setDialogConfig(null);
            }
        });
    };

    const handleCheckOut = () => {
        setDialogConfig({
            title: "Confirm Check Out",
            message: "Are you sure you want to check out? You cannot reverse this action.",
            action: async () => {
                setActionLoading(true);
                try {
                    await checkOut(session);
                } catch(err) {
                    console.error("Check out error", err);
                    alert("Failed to check out. Check your connection.");
                }
                setActionLoading(false);
                setDialogConfig(null);
            }
        });
    };

    return (
        <div className="min-h-screen bg-mesh-dark pb-[88px] md:pb-8 relative animate-fade-in">
            {/* Top Bar Area */}
            <div className="bg-card/90 w-full pt-8 pb-12 px-6 border-b border-white/5 rounded-b-4xl relative z-10 shadow-panel mb-[-2rem] backdrop-blur-xl">
                <div className="flex justify-between items-start w-full max-w-md mx-auto relative">
                    <div className="flex flex-col z-20">
                        <h2 className="text-amber font-bold text-xl mb-1">{getGreeting()},</h2>
                        <h1 className="text-textPrimary text-3xl font-bold capitalize tracking-tight">{session?.name?.split(' ')[0]}! <span className="text-2xl animate-waving-hand inline-block">👋</span></h1>
                        <p className="mt-2 text-sm text-textSecondary">Track your shift, check your zone, and review your attendance history.</p>
                    </div>
                    <Logo size="sm" className="z-20 border-card" />

                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 mix-blend-screen">
                        {/* decorative swirls to match PRD aesthetic, simulated with simple CSS */}
                        <div className="absolute top-[-50px] right-[-20px] w-32 h-32 bg-amber rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                        <div className="absolute top-[20px] left-[-20px] w-24 h-24 bg-blue rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-end w-full max-w-md mx-auto relative z-20">
                    <div className="flex flex-col">
                         <span className="text-textSecondary text-xs tracking-wider uppercase mb-1">Current Time</span>
                         <span className="text-textPrimary font-bold text-3xl tabular-nums tracking-tight">{timeString.split(' ')[0]} <span className="text-lg text-textSecondary">{timeString.split(' ')[1]}</span></span>
                    </div>
                    <span className="text-textSecondary text-xs">{dateString}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="px-6 w-full max-w-md mx-auto relative z-20 flex flex-col gap-6">
                 <button
                     type="button"
                     onClick={() => navigate('/staff-history')}
                     className="mt-1 inline-flex items-center justify-between rounded-3xl border border-white/5 bg-card/90 px-5 py-4 text-left shadow-soft transition hover:bg-card"
                 >
                     <div>
                         <p className="text-xs uppercase tracking-[0.22em] text-textSecondary">Records</p>
                         <h3 className="mt-1 text-lg font-semibold text-textPrimary">View attendance history</h3>
                     </div>
                     <span className="text-blue text-2xl">→</span>
                 </button>
                 
                 <ShiftCard 
                     sessionData={session} 
                     attendanceRecord={attendanceRecord} 
                     loadingAttendance={loadingAttendance}
                     gpsState={gpsState}
                     onCheckIn={handleCheckIn}
                     onCheckOut={handleCheckOut}
                 />

                 <StatsRow 
                     checkIn={attendanceRecord?.checkIn} 
                     checkOut={attendanceRecord?.checkOut} 
                     workHours={attendanceRecord?.checkOut
                        ? (attendanceRecord?.totalHours ? `${attendanceRecord.totalHours.toFixed(1)}h` : null)
                        : formatSecondsToHours(gpsState.inRangeWorkSeconds || attendanceRecord?.inRangeWorkSeconds || 0)
                     }
                     accuracy={gpsState.accuracy}
                     distance={gpsState.distance}
                 />

                 {needsHttps && (
                    <RuntimeNotice variant="error">
                        Secure HTTPS is required for reliable GPS tracking outside localhost. Deploy this app behind HTTPS before live use.
                    </RuntimeNotice>
                 )}
                 {gpsState.permissionState === 'denied' && (
                    <RuntimeNotice variant="error">
                        Location permission is blocked. Enable location access in your browser settings to check in and keep tracking active.
                    </RuntimeNotice>
                 )}
                 {gpsState.isBackgrounded && (
                    <RuntimeNotice variant="warning">
                        Location tracking may pause in background on Android Chrome and iOS Safari. Keep this tab active during the shift when possible.
                    </RuntimeNotice>
                 )}

                 <ZoneBadge state={gpsState} />

                 <TrackingDebugPanel
                    state={gpsState}
                    enabled={testMode}
                    onToggle={() => setTestMode((value) => !value)}
                 />

                 {/* Extra space bottom for scroll if needed */}
                 <div className="h-4"></div>
            </div>

            <BottomNav />

            {dialogConfig && (
                <ConfirmDialog 
                    isOpen={!!dialogConfig}
                    title={dialogConfig.title}
                    message={dialogConfig.message}
                    onConfirm={dialogConfig.action}
                    onCancel={() => setDialogConfig(null)}
                    confirmText={actionLoading ? 'Processing...' : 'Confirm'}
                />
            )}
        </div>
    );
};

export default StaffDashboard;
