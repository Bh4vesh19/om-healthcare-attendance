import React from 'react';

const RuntimeNotice = ({ variant = 'warning', children }) => {
  const variants = {
    warning: 'border-amber/30 bg-amber/10 text-amber',
    error: 'border-red/30 bg-red/10 text-red',
    info: 'border-blue/30 bg-blue/10 text-blue'
  };

  return (
    <div className={`rounded-3xl border px-4 py-3 text-sm font-medium shadow-soft ${variants[variant] || variants.warning}`}>
      {children}
    </div>
  );
};

export default RuntimeNotice;
