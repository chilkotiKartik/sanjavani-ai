import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = {
  title: 'System — Sanjeevani',
  description: 'What this deployment is running, and the safety evaluation re-run in your browser.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
