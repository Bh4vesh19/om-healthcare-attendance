import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { loadStaffHistory } from '../firebase/attendance';

import Logo from '../components/common/Logo';
import StatusBadge from '../components/common/StatusBadge';
import BottomNav from '../components/staff/BottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StaffHistory = () => {
    const { session } = useAuthContext();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.docId) return;

        const fetchHistory = async () => {
            try {
                const records = await loadStaffHistory(session.docId);
                setHistory(records);
            } catch (err) {
                console.error("Error fetching history", err);
            }
            setLoading(false);
        };

        fetchHistory();
    }, [session]);

    return (
        <div className="min-h-screen bg-mesh-dark pb-[88px] md:pb-8 relative animate-fade-in">
            <header className="h-[86px] bg-card/90 backdrop-blur-xl border-b border-white/5 flex items-center px-6 sticky top-0 z-30 shadow-panel">
                <Logo size="sm" className="mr-4" />
                <div className="flex-1">
                    <h1 className="text-amber font-bold text-xl">My History</h1>
                    <p className="text-textSecondary text-xs">Every recorded check-in, checkout, and worked hours</p>
                </div>
            </header>

            <main className="p-4 md:p-6 w-full max-w-2xl mx-auto flex flex-col gap-4">
                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
                ) : history.length === 0 ? (
                    <div className="py-20 text-center text-textSecondary bg-card/90 rounded-4xl border border-white/5 mt-4 shadow-panel">
                        <span className="text-4xl block mb-2">📅</span>
                        No attendance records found.
                    </div>
                ) : (
                    history.map((record) => (
                        <div key={record.id} className="bg-card/90 border border-white/5 rounded-4xl p-5 md:p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1 shadow-soft">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                               <div className="flex items-center gap-2">
                                  <span className="text-xl">📅</span>
                                  <span className="font-bold text-textPrimary">{record.date}</span>
                               </div>
                               <StatusBadge status={record.status} />
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <div className="flex flex-col">
                                   <span className="text-[10px] text-textSecondary uppercase tracking-wide">Check In</span>
                                   <span className="font-bold text-textPrimary text-sm">{record.checkIn || '--:--'}</span>
                               </div>
                               <div className="flex flex-col text-right">
                                   <span className="text-[10px] text-textSecondary uppercase tracking-wide">Check Out</span>
                                   <span className="font-bold text-textPrimary text-sm">{record.checkOut || '--:--'}</span>
                               </div>
                               <div className="flex flex-col">
                                   <span className="text-[10px] text-textSecondary uppercase tracking-wide">Total Out</span>
                                   <span className={`font-bold text-sm ${record.totalOutMins > 0 ? 'text-amber' : 'text-textPrimary'}`}>
                                       {record.totalOutMins ? `${Math.floor(record.totalOutMins)}m` : '0m'}
                                   </span>
                               </div>
                               <div className="flex flex-col text-right">
                                   <span className="text-[10px] text-textSecondary uppercase tracking-wide">Work Hours</span>
                                   <span className="font-bold text-blue text-sm">
                                       {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '0h'}
                                   </span>
                               </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default StaffHistory;
