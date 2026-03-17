import React, { memo } from 'react';
import AttendanceRow from './AttendanceRow';
import LoadingSpinner from '../common/LoadingSpinner';

const AttendanceTable = ({ records, loading, onMarkAbsent }) => {
  return (
    <section className="bg-card/90 border border-white/5 rounded-4xl overflow-hidden mt-8 shadow-panel">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-textPrimary">Live Staff Status Panel</h3>
          <p className="text-sm text-textSecondary">Real-time in-range status, distance from center, movement state, and worked hours.</p>
        </div>
        <div className="hidden md:flex items-center rounded-full border border-white/5 bg-primary/70 px-4 py-2 text-xs uppercase tracking-[0.22em] text-textSecondary">
          Realtime
        </div>
      </div>
      <div className="scroll-touch overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left md:min-w-[980px]">
          <thead>
            <tr className="bg-primary/70 border-b border-white/5">
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Staff Name</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Range Status</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Distance</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Movement</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Work Hours</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Check In</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase">Last Seen</th>
              <th className="p-4 text-xs font-semibold tracking-[0.18em] text-textSecondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-10 text-center">
                  <LoadingSpinner size="lg" />
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-textSecondary">
                  No active staff tracking records for today
                </td>
              </tr>
            ) : (
              records.map(record => (
                <AttendanceRow 
                  key={record.id} 
                  record={record} 
                  onMarkAbsent={onMarkAbsent} 
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default memo(AttendanceTable);
