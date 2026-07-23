import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import { AuthScreen } from '@/screens/AuthScreen';
import { AppShell } from '@/components/AppShell';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { HomeScreen } from '@/screens/HomeScreen';
import { NewRequestScreen } from '@/screens/NewRequestScreen';
import { MyRequestsScreen } from '@/screens/MyRequestsScreen';
import { RequestDetailScreen } from '@/screens/RequestDetailScreen';
import { PolicyScreen } from '@/screens/PolicyScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { GestaoPanelScreen } from '@/screens/GestaoPanelScreen';
import { QueueScreen } from '@/screens/QueueScreen';
import { WorksitesScreen } from '@/screens/WorksitesScreen';
import { UsersScreen } from '@/screens/UsersScreen';
import { OverviewScreen } from '@/screens/OverviewScreen';

function Routes() {
  const { route, params } = useRouter();
  const { profile } = useAuth();

  if (!profile) return null;
  const isManagement = profile.role === 'gestao_viagens' || profile.role === 'super_admin';

  if (route === 'new-request') return <NewRequestScreen />;
  if (route === 'my-requests') return <MyRequestsScreen />;
  if (route.startsWith('request/')) return <RequestDetailScreen id={params[1]} />;
  if (route === 'policy') return <PolicyScreen />;
  if (route === 'profile') return <ProfileScreen />;

  if (route === 'users') return isManagement ? <UsersScreen /> : <EmptyState title="Acesso não autorizado" />;
  if (route === 'worksites') return isManagement ? <WorksitesScreen /> : <EmptyState title="Acesso não autorizado" />;
  if (route === 'queue' || route === 'all-requests') return isManagement ? <QueueScreen /> : <EmptyState title="Acesso não autorizado" />;
  if (route === 'panel') return profile.role === 'gestao_viagens' ? <GestaoPanelScreen /> : <EmptyState title="Acesso não autorizado" />;
  if (route === 'overview') return profile.role === 'super_admin' ? <OverviewScreen /> : <EmptyState title="Acesso não autorizado" />;

  if (profile.role === 'solicitante') return <HomeScreen />;
  if (profile.role === 'gestao_viagens') return <GestaoPanelScreen />;
  return <OverviewScreen />;
}

function Shell() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><PageLoader /></div>;
  }
  if (!session || !profile) return <AuthScreen />;

  return <AppShell><Routes /></AppShell>;
}

export default function App() {
  return <AuthProvider><RouterProvider><Shell /></RouterProvider></AuthProvider>;
}
