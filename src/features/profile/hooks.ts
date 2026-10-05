'use client';
import { useEffect, useState } from 'react';
import { MemberProfile } from '@/domain/models';
import { useDemo } from '@/features/demo/provider';
export function useProfile() {
  const { context, repo, version, ready } = useDemo();
  const key = `${context.messId}:${context.userId}`;
  const [loaded, setLoaded] = useState<{ key: string; data?: MemberProfile; error?: Error } | null>(
    null,
  );
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    repo
      .profile({ messId: context.messId, userId: context.userId, memberId: context.userId })
      .then((data) => {
        if (alive) setLoaded({ key, data });
      })
      .catch((error: Error) => {
        if (alive) setLoaded({ key, error });
      });
    return () => {
      alive = false;
    };
  }, [key, context.messId, context.userId, repo, ready, version]);
  const current = loaded?.key === key ? loaded : null;
  return { data: current?.data, error: current?.error, loading: !ready || !current };
}
