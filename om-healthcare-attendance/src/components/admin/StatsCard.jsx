import React from 'react';

const StatsCard = ({ title, value, type }) => {
  const styles = {
    present: 'border-l-4 border-l-green',
    absent: 'border-l-4 border-l-red',
    late: 'border-l-4 border-l-amber',
    flagged: 'border-l-4 border-l-red animate-pulse-red'
  };

  const currentStyle = styles[type] || '';

  return (
    <div className={`card p-6 flex flex-col justify-center transition-transform hover:-translate-y-1 ${currentStyle}`}>
      <span className="text-3xl font-bold text-textPrimary mb-1">{value}</span>
      <span className="text-textSecondary text-sm uppercase tracking-wide">{title}</span>
    </div>
  );
};

export default StatsCard;
