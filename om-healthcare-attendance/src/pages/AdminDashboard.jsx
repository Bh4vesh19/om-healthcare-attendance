import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentDate } from '../utils/shiftHelper';

import AdminSidebar from '../components/admin/AdminSidebar';
import TopBar from '../components/admin/TopBar';
import StatsCard from '../components/admin/StatsCard';
import AttendanceTable from '../components/admin/AttendanceTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const LiveMap = lazy(() => import('../components/admin/LiveMap'));

const AdminDashboard = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const today = getCurrentDate();
    const q = query(collection(db, 'attendance'), where('date', '==', today));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => ({
    present: records.filter(r => r.status === 'Present' && r.zoneStatus === 'in_zone').length,
    absent: records.filter(r => r.status === 'Absent').length,
    late: records.filter(r => r.status === 'Late').length,
    flagged: records.filter(r => r.zoneStatus === 'out_of_zone' && r.status !== 'Absent').length
  }), [records]);

  const handleMarkAbsentClick = (record) => {
    setSelectedRecord(record);
    setDialogOpen(true);
  };

  const confirmMarkAbsent = async () => {
    if (!selectedRecord) return;
    try {
      const docRef = doc(db, 'attendance', selectedRecord.id);
      await updateDoc(docRef, {
        status: 'Absent',
        updatedAt: serverTimestamp()
      });
      setDialogOpen(false);
      setSelectedRecord(null);
    } catch (err) {
      console.error("Error marking absent:", err);
      alert("Failed to mark absent. Check connection.");
    }
  };

  return (
    <div className="flex min-h-screen bg-mesh-dark">
      <AdminSidebar />
      <div className="flex-1 md:ml-[272px] flex flex-col min-h-screen">
        <TopBar isOnline={isOnline} />
        
        <main className="flex-1 p-4 md:p-8 z-10 max-w-[1440px] w-full mx-auto">
          {!isOnline && (
             <div className="mb-5 p-4 bg-red/10 border border-red/40 text-red rounded-2xl text-sm text-center font-bold animate-pulse-red shadow-soft">
                 You are currently offline. Changes will sync when connection is restored.
             </div>
          )}

          <section className="mb-6 rounded-4xl border border-white/5 bg-card/70 backdrop-blur-xl p-6 shadow-panel">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-textSecondary">Daily Summary</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-textPrimary">Classic attendance dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-textSecondary">Monitor present staff, late arrivals, zone state, and manual exceptions from one clean surface.</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="In Range" value={stats.present} type="present" />
            <StatsCard title="Absent" value={stats.absent} type="absent" />
            <StatsCard title="Late Arrivals" value={stats.late} type="late" />
            <StatsCard title="Out of Range" value={stats.flagged} type="flagged" />
          </div>

          <Suspense fallback={<section className="mt-6 flex h-[240px] items-center justify-center rounded-4xl border border-white/5 bg-card/90 shadow-panel"><LoadingSpinner /></section>}>
            <LiveMap records={records} />
          </Suspense>

          <AttendanceTable 
            records={records} 
            loading={loading} 
            onMarkAbsent={handleMarkAbsentClick} 
          />
        </main>
      </div>

      <ConfirmDialog 
        isOpen={dialogOpen}
        title="Mark as Absent?"
        message={`Are you sure you want to mark ${selectedRecord?.staffName} as absent for today? This cannot be undone.`}
        onConfirm={confirmMarkAbsent}
        onCancel={() => setDialogOpen(false)}
        confirmText="Mark Absent"
        isDanger={true}
      />
    </div>
  );
};

export default AdminDashboard;
