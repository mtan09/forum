import { useAuth } from '@/context/authContext';
import { api } from '@/lib/api';
import type { DailyBrief } from '@/types/daily-brief';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

const millisecondsUntilNextBrief = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(7, 0, 5, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return Math.max(1_000, next.getTime() - now.getTime());
};

export default function DailyBriefGate() {
  const { session, loading, needsOnboarding } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const inFlight = useRef(false);
  const lastOpened = useRef<string | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const check = useCallback(async () => {
    if (loading || !session || needsOnboarding || inFlight.current) return;
    if (pathRef.current.startsWith('/auth') || pathRef.current === '/onboarding' || pathRef.current.startsWith('/brief/')) return;
    inFlight.current = true;
    try {
      const result = await api<{ ready: boolean; brief: DailyBrief | null }>(
        `/briefs/today?timezone=${encodeURIComponent(timezone())}`
      );
      const brief = result.brief;
      if (brief && !brief.seen_at && lastOpened.current !== brief.id) {
        lastOpened.current = brief.id;
        router.push(`/brief/${brief.brief_date}` as never);
      }
    } catch {
      // The brief is supplementary; a network failure must never block Home.
    } finally {
      inFlight.current = false;
    }
  }, [loading, needsOnboarding, router, session]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, [check]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        void check();
        schedule();
      }, millisecondsUntilNextBrief());
    };
    schedule();
    return () => clearTimeout(timer);
  }, [check]);

  return null;
}
