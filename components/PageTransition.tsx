"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animationKey, setAnimationKey] = useState(pathname);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      setAnimationKey(pathname);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return (
    <div key={animationKey} className="animate-page-enter">
      {children}
    </div>
  );
}
