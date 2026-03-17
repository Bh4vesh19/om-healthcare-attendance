import React from 'react';

const StatsRow = ({ checkIn, checkOut, workHours, accuracy, distance }) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
      <div className="card p-3 flex flex-col items-center justify-center gap-1 text-center bg-cardHover/50">
        <span className="text-textSecondary text-[10px] tracking-wide uppercase">Check In</span>
        <span className="text-textPrimary font-bold text-sm">{checkIn || '--:--'}</span>
      </div>
      
      <div className="card p-3 flex flex-col items-center justify-center gap-1 text-center bg-cardHover/50">
        <span className="text-textSecondary text-[10px] tracking-wide uppercase">Check Out</span>
        <span className="text-textPrimary font-bold text-sm">{checkOut || '--:--'}</span>
      </div>
      
      <div className="card p-3 flex items-center justify-center gap-3 text-center bg-cardHover/50">
        <div className="w-8 h-8 rounded-full border-[3px] border-blue border-r-transparent flex-shrink-0 animate-spin" style={{ animationDuration: '3s' }}></div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-textSecondary text-[10px] tracking-wide uppercase">Work Hours</span>
          <span className="text-blue font-bold text-sm">{workHours || '0h 0m'}</span>
        </div>
      </div>

      <div className="card p-3 flex flex-col items-center justify-center gap-1 text-center bg-cardHover/50">
        <span className="text-textSecondary text-[10px] tracking-wide uppercase">GPS Accuracy</span>
        <span className="text-textPrimary font-bold text-sm">{accuracy != null ? `${Math.round(accuracy)}m` : '--'}</span>
        <span className="text-[10px] text-textSecondary">{distance != null ? `${Math.round(distance)}m from center` : 'Awaiting fix'}</span>
      </div>
    </div>
  );
};

export default StatsRow;
