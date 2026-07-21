import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import { AuthScreen } from '@/screens/AuthScreen';
import { AppShell } from '@/components/AppShell';
import { PageLoader } from '@/components/ui/Feedback';
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
import { TravelersScreen } from '@/screens/TravelersScreen';
import { SuppliersScreen } from '@/screens/SuppliersScreen';
import { RulesScreen } from '@/screens/RulesScreen';
import { FaqAdminScreen } from '@/screens/FaqAdminScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';
import { AuditScreen } from '@/screens/AuditScreen';
import { OverviewScreen } from '@/screens/OverviewScreen';
import { UpcomingScreen } from '@/screens/UpcomingScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

function Routes() {
  const { route, params } = useRouter();
  const { profile } = useAuth();

  if (route === 'new-request') return <NewRequestScreen />;
  if (route === 'my-requests') return <MyRequestsScreen />;
  if (route.startsWith('request/')) return <RequestDetailScreen id={params[1]} />;
  if (route === 'policy') return <PolicyScreen />;
  if (route === 'profile') return <ProfileScreen />;
  if (route === 'panel') return <GestaoPanelScreen />;
  if (route === 'queue') return <QueueScreen filterStatus={['enviada', 'aguardando_atendimento']} title="Aguardando atendimento" />;
  if (route === 'waiting') return <QueueScreen filterStatus={['enviada', 'aguardando_atendimento']} title="Aguardando atendimento" />;
  if (route === 'attendance') return <QueueScreen filterStatus={['em_analise', 'em_orcamento', 'em_negociacao', 'em_compra', 'aguardando_informacoes']} title="Em atendimento" />;
  if (route === 'purchases') return <QueueScreen filterStatus={['compra_realizada']} title="Compras realizadas" />;
  if (route === 'upcoming') return <UpcomingScreen />;
  if (route === 'worksites') return <WorksitesScreen />;
  if (route === 'users') return <UsersScreen />;
  if (route === 'travelers') return <TravelersScreen />;
  if (route === 'suppliers') return <SuppliersScreen />;
  if (route === 'reports') return <ReportsScreen />;
  if (route === 'rules') return <RulesScreen />;
  if (route === 'faq-admin') return <FaqAdminScreen />;
  if (route === 'audit') return <AuditScreen />;
  if (route === 'settings') return <SettingsScreen />;
  if (route === 'all-requests') return <QueueScreen title="Todas as solicitações" />;

  // role-based default
  if (profile?.role === 'solicitante') return <HomeScreen />;
  if (profile?.role === 'gestao_viagens') return <GestaoPanelScreen />;
  if (profile?.role === 'super_admin') return <OverviewScreen />;
  return <HomeScreen />;
}

function Shell() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }
  if (!session || !profile) return <AuthScreen />;

  return (
    <AppShell>
      <Routes />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </AuthProvider>
  );
}
