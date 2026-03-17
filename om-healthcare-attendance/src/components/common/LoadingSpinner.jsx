import React from 'react';

const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full border-t-blue border-r-transparent border-b-blue border-l-transparent ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;
