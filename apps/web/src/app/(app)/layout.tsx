import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanners } from '@/components/subscription-banners';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <SubscriptionBanners />
      {children}
    </AppShell>
  );
}
