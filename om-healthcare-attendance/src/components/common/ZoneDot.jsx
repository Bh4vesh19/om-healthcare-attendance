import React from 'react';

const ZoneDot = ({ status }) => {
  if (status === 'in_zone') {
    return (
      <div className="flex items-center gap-2 text-green font-medium">
        <div className="w-2.5 h-2.5 rounded-full bg-green shadow-[0_0_8px_#3FB950] animate-pulse-green"></div>
        IN ZONE
      </div>
    );
  } else if (status === 'out_of_zone') {
    return (
      <div className="flex items-center gap-2 text-red font-medium">
        <div className="w-2.5 h-2.5 rounded-full bg-red shadow-[0_0_8px_#F85149]"></div>
        OUT
      </div>
    );
  } else {
    // Unknown or pending
    return (
      <div className="flex items-center gap-2 text-textSecondary font-medium">
        <div className="w-2.5 h-2.5 rounded-full bg-textSecondary"></div>
        Unknown
      </div>
    );
  }
};

export default ZoneDot;
