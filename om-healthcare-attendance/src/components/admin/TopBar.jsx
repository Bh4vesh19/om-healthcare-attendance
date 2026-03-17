import React from 'react';
import Logo from '../common/Logo';
import { useLiveClock } from '../../hooks/useLiveClock';

const TopBar = ({ isOnline = true }) => {
  const { timeString, dateString } = useLiveClock(60000);

  return (
    <header className="h-[86px] bg-primary/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
         <div className="md:hidden rounded-2xl border border-white/10 bg-white/5 p-2">
             <Logo size="sm" />
         </div>
         <div className="md:hidden">
           <h1 className="text-amber font-bold text-xl">Admin Panel</h1>
           <p className="text-textSecondary text-xs">Attendance control center</p>
         </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden sm:flex flex-col items-end rounded-2xl border border-white/5 bg-card/70 px-4 py-2 shadow-soft">
          <span className="text-textPrimary font-bold">{timeString.slice(0, 5)} {timeString.slice(-2)}</span>
          <span className="text-textSecondary text-xs">{dateString}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-card/80 border border-white/5 px-4 py-2 rounded-full text-xs font-medium shadow-soft">
           {isOnline ? (
               <>
                  <div className="w-2 h-2 rounded-full bg-green animate-pulse-green"></div>
                  <span className="text-green">Connected</span>
               </>
           ) : (
               <>
                  <div className="w-2 h-2 rounded-full bg-red"></div>
                  <span className="text-red">Offline</span>
               </>
           )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
