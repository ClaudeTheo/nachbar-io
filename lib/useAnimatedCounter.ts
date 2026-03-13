import { useEffect, useRef, useState } from "react";

// Animierter Counter mit requestAnimationFrame
// Zaehlt von 0 auf target in ~duration ms mit ease-out
export function useAnimatedCounter(target: number, duration = 400): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;

    if (target === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Animation-Reset gewollt
      setValue(0);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setValue(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}
