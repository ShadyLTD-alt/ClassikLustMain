import React, { useEffect } from "react";

export default function ModalPortal({ children, open }: { children: React.ReactNode; open: boolean; }) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      {children}
    </div>
  );
}
