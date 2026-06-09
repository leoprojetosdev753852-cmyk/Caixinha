import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyRefreshToken } from '@/lib/auth';
import { SessionGuard } from '@/components/session-guard';
import { BottomNav } from '@/components/layouts/bottom-nav';
import { Toaster } from '@/components/ui/toast';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const refreshToken = cookies().get('refreshToken')?.value;
  if (!refreshToken) redirect('/login');

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) redirect('/login');

  return (
    <SessionGuard requiredRole="ADMIN">
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-md pb-20">{children}</main>
        <BottomNav role="ADMIN" />
        <Toaster />
      </div>
    </SessionGuard>
  );
}