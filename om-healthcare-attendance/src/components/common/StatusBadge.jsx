import React from 'react';

const StatusBadge = ({ status }) => {
  const config = {
    'Present': 'bg-green/10 text-green border border-green/20',
    'Late': 'bg-amber/10 text-amber border border-amber/20',
    'Absent': 'bg-red/10 text-red border border-red/20',
    'Flagged': 'bg-red/10 text-red border border-red animate-pulse-red'
  };

  const currentConfig = config[status] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${currentConfig}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
