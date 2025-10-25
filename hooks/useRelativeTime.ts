import { useEffect, useState } from 'react';

export function useRelativeTime(timestamp: string): string {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    function getRelativeTime() {
      const date = new Date(timestamp);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // If more than 24 hours ago, return formatted date
      if (seconds >= 86400) {
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        });
      }

      const intervals = {
        hour: 3600,
        minute: 60,
        second: 1
      };

      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
          return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
      }

      return 'just now';
    }

    // Update initially
    setRelativeTime(getRelativeTime());

    // Update every minute
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime());
    }, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, [timestamp]);

  return relativeTime;
}