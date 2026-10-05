'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { repository } from '@/data/mock/repository';
import { MessRepository } from '@/data/repositories/interface';
import { Context, MonthView, Session } from '@/domain/models';
interface DemoState {
  context: Context;
  session: Session | null;
  ready: boolean;
  repo: MessRepository;
  version: number;
  switchContext: (change: Partial<Pick<Context, 'monthId' | 'userId'>>) => void;
  refresh: () => void;
  notify: (message: string, error?: boolean) => void;
  reset: () => Promise<void>;
}
const DemoContext = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState<Context>({
    messId: 'a',
    monthId: 'a-2026-09',
    userId: 'a1',
  });
  const [session, setSession] = useState<Session | null>(null);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('messkhata-demo-context');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'messId' in parsed &&
          'monthId' in parsed &&
          'userId' in parsed &&
          typeof parsed.messId === 'string' &&
          parsed.messId === 'a' &&
          typeof parsed.monthId === 'string' &&
          new RegExp(`^${parsed.messId}-2026-\\d{2}$`).test(parsed.monthId) &&
          typeof parsed.userId === 'string' &&
          new RegExp(`^${parsed.messId}[1-7]$`).test(parsed.userId)
        )
          setContext({
            ...(parsed as Context),
            monthId: [
              `${parsed.messId}-2026-07`,
              `${parsed.messId}-2026-08`,
              `${parsed.messId}-2026-09`,
            ].includes(parsed.monthId)
              ? parsed.monthId
              : `${parsed.messId}-2026-09`,
          });
      }
    } catch {
      /* Storage may be unavailable; use safe demo defaults. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem('messkhata-demo-context', JSON.stringify(context));
    } catch {
      /* Memory navigation still works. */
    }
  }, [context, ready]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    repository
      .session(context)
      .then((s) => {
        if (alive) setSession(s);
      })
      .catch((e) => {
        if (alive) notify(e.message, true);
      });
    return () => {
      alive = false;
    };
  }, [context, version, notify, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const switchContext = (change: Partial<Pick<Context, 'monthId' | 'userId'>>) => {
    setSession(null);
    setContext((c) => ({ ...c, ...change }));
    router.replace('/');
  };
  const reset = async () => {
    await repository.reset();
    switchContext({ monthId: 'a-2026-09', userId: 'a1' });
    refresh();
    notify('ডেমো তার প্রাথমিক অবস্থায় ফিরে এসেছে।');
  };
  return (
    <DemoContext.Provider
      value={{
        context,
        session,
        ready,
        repo: repository,
        version,
        switchContext,
        refresh,
        notify,
        reset,
      }}
    >
      {children}
      {toast && (
        <div
          role={toast.error ? 'alert' : 'status'}
          className={`toast ${toast.error ? 'toast-error' : ''}`}
        >
          <span>{toast.message}</span>
          <button aria-label="বার্তা বন্ধ করুন" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const c = useContext(DemoContext);
  if (!c) throw new Error('DemoProvider is required');
  return c;
}
export function useMonth() {
  const { context, repo, version, ready } = useDemo();
  const key = JSON.stringify(context);
  const [loaded, setLoaded] = useState<{
    key: string;
    version: number;
    data?: MonthView;
    error?: Error;
  } | null>(null);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    repo
      .view(context)
      .then((data) => {
        if (alive) setLoaded({ key, version, data });
      })
      .catch((error) => {
        if (alive) setLoaded({ key, version, error });
      });
    return () => {
      alive = false;
    };
  }, [context, key, repo, version, ready]);
  const current = loaded?.key === key ? loaded : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: !ready || !current,
    refreshing: !!current && current.version !== version,
  };
}
export function useMutation() {
  const { refresh, notify } = useDemo();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>, success = 'পরিবর্তন সংরক্ষিত হয়েছে।') => {
    if (pending) return false;
    setPending(true);
    setError('');
    try {
      await action();
      refresh();
      notify(success);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'আবার চেষ্টা করুন।';
      setError(message);
      notify(message, true);
      refresh();
      return false;
    } finally {
      setPending(false);
    }
  };
  return { run, pending, error };
}
