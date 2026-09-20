import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/shell';
import { AuthProvider, useAuth } from '@/lib/auth';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Cases from '@/pages/cases';
import NewScreening from '@/pages/screening-new';
import AnalysisWorkstation from '@/pages/analysis';
import Review from '@/pages/review';
import Login from '@/pages/login';
import { Audit, CaseDetail, Operations, Reports, SettingsPage, UsersPage } from '@/pages/support';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="size-10 rounded-xl bg-primary animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Loading DRISHTI Clinical Workstation...
          </p>
        </div>
      </div>
    );
  }

  const authenticated = Boolean(user) && location !== '/';

  return (
    <RoutedErrorBoundary>
      {authenticated ? (
        <AppShell>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/screening/new" component={NewScreening} />
            <Route path="/analysis/:caseId" component={AnalysisWorkstation} />
            <Route path="/review/:caseId" component={Review} />
            <Route path="/cases/:id" component={CaseDetail} />
            <Route path="/cases" component={Cases} />
            <Route path="/operations" component={Operations} />
            <Route path="/users" component={UsersPage} />
            <Route path="/security/audit" component={Audit} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/reports" component={Reports} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      ) : (
        <Switch>
          <Route path="/" component={Login} />
          <Route component={Login} />
        </Switch>
      )}
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
