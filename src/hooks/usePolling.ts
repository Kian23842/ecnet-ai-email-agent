import { useEffect, useRef } from 'react';

// Replaces Firestore onSnapshot with HTTP polling
export function usePolling(fn: () => void, intervalMs = 15000, enabled = true) {
  const savedFn = useRef(fn);
  useEffect(() => { savedFn.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    savedFn.current(); // immediate first fetch
    const id = setInterval(() => savedFn.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
