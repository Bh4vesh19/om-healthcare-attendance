import React, { memo } from 'react';
import { formatSecondsToHours } from '../../utils/shiftHelper';

const AttendanceRow = ({ record, onMarkAbsent }) => {
  const {
    staffName,
    checkIn,
    distanceMeters,
    movementStatus,
    gpsAccuracyMeters,
    totalHours,
    zoneStatus,
    status,
    lastGpsCheck,
    inRangeWorkSeconds,
    trackingMode
  } = record;

  const rangeStatus = zoneStatus === 'out_of_zone' ? 'Out of Range' : zoneStatus === 'in_zone' ? 'In Range' : 'GPS Pending';
  const rangeClass = zoneStatus === 'out_of_zone'
    ? 'bg-red/10 text-red border border-red/20'
    : zoneStatus === 'in_zone'
      ? 'bg-green/10 text-green border border-green/20'
      : 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  const showMarkAbsent = !checkIn && status !== 'Absent';
  const lastSeen = lastGpsCheck?.toDate ? lastGpsCheck.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';
  const workHoursDisplay = inRangeWorkSeconds ? formatSecondsToHours(inRangeWorkSeconds) : totalHours ? `${totalHours.toFixed(1)}h` : '0h 0m';

  return (
    <tr className={`border-b border-border transition-colors hover:bg-cardHover ${zoneStatus === 'out_of_zone' ? 'border-l-4 border-l-red bg-red/5' : ''}`}>
      <td className="p-4 font-bold text-textPrimary capitalize whitespace-nowrap">{staffName}</td>
      <td className="p-4">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${rangeClass}`}>
          <span className={`h-2 w-2 rounded-full ${zoneStatus === 'out_of_zone' ? 'bg-red' : zoneStatus === 'in_zone' ? 'bg-green' : 'bg-gray-400'}`}></span>
          {rangeStatus}
        </span>
      </td>
      <td className="p-4 font-medium text-textPrimary">
        <div className="flex flex-col">
          <span>{distanceMeters != null ? `${Math.round(distanceMeters)} m` : '--'}</span>
          <span className="text-xs text-textSecondary">{gpsAccuracyMeters != null ? `Acc ${Math.round(gpsAccuracyMeters)}m` : 'Acc --'}</span>
        </div>
      </td>
      <td className="p-4 text-textPrimary">
        <div className="flex flex-col">
          <span>{movementStatus || 'Idle'}</span>
          <span className="text-xs text-textSecondary capitalize">{trackingMode || 'foreground'}</span>
        </div>
      </td>
      <td className="p-4 font-bold text-blue whitespace-nowrap">{workHoursDisplay}</td>
      <td className={`p-4 ${!checkIn ? 'text-textSecondary' : 'text-textPrimary'}`}>{checkIn || '--:--'}</td>
      <td className="p-4 text-textSecondary whitespace-nowrap">{lastSeen}</td>
      <td className="p-4 text-right">
        {showMarkAbsent && (
          <button 
            onClick={() => onMarkAbsent(record)}
            className="px-4 py-2 bg-red/10 text-red border border-red/20 rounded-2xl hover:bg-red/20 text-xs font-bold transition-colors"
          >
            ❌ Mark Absent
          </button>
        )}
      </td>
    </tr>
  );
};

export default memo(AttendanceRow);
