import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

// 🔧 ENHANCED: Better ScrollContainer with fallback for modal issues
export const ScrollContainer: React.FC<{
  height?: string; 
  className?: string; 
  children: React.ReactNode;
  maxHeight?: string;
  suppressScrollX?: boolean;
  suppressScrollY?: boolean;
}> = ({ 
  height = 'h-[84vh]', 
  className = '', 
  children, 
  maxHeight,
  suppressScrollX = true,
  suppressScrollY = false
}) => {
  // 🔧 FALLBACK: Use native scroll if PerfectScrollbar fails in modals
  const [useFallback, setUseFallback] = React.useState(false);
  
  React.useEffect(() => {
    // Check if we're in a modal context where PerfectScrollbar might not work
    const isInModal = document.querySelector('.modal-content') || document.querySelector('[role="dialog"]');
    if (isInModal) {
      console.log('🔍 [SCROLL] Using fallback scroll for modal context');
      setUseFallback(true);
    }
  }, []);
  
  const containerStyle = {
    ...(maxHeight && { maxHeight }),
    overflowY: suppressScrollY ? 'hidden' as const : 'auto' as const,
    overflowX: suppressScrollX ? 'hidden' as const : 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
    scrollBehavior: 'smooth' as const
  };
  
  if (useFallback) {
    // Native scroll fallback for problematic contexts
    return (
      <div 
        className={`${height} ${className}`} 
        style={containerStyle}
      >
        {children}
      </div>
    );
  }
  
  // Default PerfectScrollbar behavior
  return (
    <div className={`${height} ${className}`} style={maxHeight ? { maxHeight } : {}}>
      <PerfectScrollbar 
        options={{ 
          suppressScrollX, 
          suppressScrollY,
          wheelPropagation: false,
          swipeEasing: true,
          minScrollbarLength: 20
        }}
        onError={(error) => {
          console.warn('🔍 [SCROLL] PerfectScrollbar error, falling back to native:', error);
          setUseFallback(true);
        }}
      >
        {children}
      </PerfectScrollbar>
    </div>
  );
};