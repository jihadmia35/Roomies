import { Suspense } from 'react';
import { Loading } from '@/components/ui';
import { RouteScreen } from '@/app/route-screen';
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <RouteScreen path={path?.join('/') ?? ''} />
    </Suspense>
  );
}
