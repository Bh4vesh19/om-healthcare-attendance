import React from 'react';

const Logo = ({ size = 'md', className = '', priority = false }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className={`rounded-full overflow-hidden border-2 border-border shadow-lg ${sizeClasses[size]} ${className}`}>
      <img
        src="/logo.png"
        alt="OM Health Care Logo"
        className="w-full h-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
};

export default Logo;
