import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

const useIdleTimeout = () => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (!user) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      signOut();
    }, IDLE_TIMEOUT);
  }, [user, signOut]);

  const handleActivity = useCallback(() => {
    if (!user || isIdleRef.current) return;
    resetTimer();
  }, [user, resetTimer]);

  useEffect(() => {
    if (!user) {
      // Clear timeout when user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isIdleRef.current = false;
      return;
    }

    // Reset idle flag when user logs in
    isIdleRef.current = false;

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, handleActivity, resetTimer]);

  return null;
};

export default useIdleTimeout;