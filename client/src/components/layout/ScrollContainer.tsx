import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

export const ScrollContainer: React.FC<{height?: string; className?: string; children: React.ReactNode}> = ({ height = 'h-[84vh]', className = '', children }) => (
  <div className={`${height} ${className}`}>
    <PerfectScrollbar options={{ suppressScrollX: true }}>
      {children}
    </PerfectScrollbar>
  </div>
);
