import { Suspense, lazy } from "react";
import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/hooks/useAuth";
import { ThemeProvider } from "@/shared/hooks/useTheme";
import { AppLayout } from "@/shared/layouts/AppLayout";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import Landing from "@/features/auth/pages/Landing";
import Auth from "@/features/auth/pages/Auth";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));
const Transactions = lazy(() => import("@/features/transactions/pages/Transactions"));
const Goals = lazy(() => import("@/features/goals/pages/Goals"));
const CreditCards = lazy(() => import("@/features/credit-cards/pages/CreditCards"));
const Investments = lazy(() => import("@/features/investments/pages/Investments"));
const Crypto = lazy(() => import("@/features/crypto/pages/Crypto"));
const Analytics = lazy(() => import("@/features/analytics/pages/Analytics"));
const FinancialHealth = lazy(() => import("@/features/financial-health/pages/FinancialHealth"));
const Simulator = lazy(() => import("@/features/simulator/pages/Simulator"));
const ImportCSV = lazy(() => import("@/features/import/pages/ImportCSV"));
const AltInvestments = lazy(() => import("@/features/alt-investments/pages/AltInvestments"));
const Earnings = lazy(() => import("@/features/earnings/pages/Earnings"));
const Accounts = lazy(() => import("@/features/accounts/pages/Accounts"));
const Subscriptions = lazy(() => import("@/features/subscriptions/pages/Subscriptions"));
const NetWorth = lazy(() => import("@/features/net-worth/pages/NetWorth"));
const Categories = lazy(() => import("@/features/categories/pages/Categories"));
const ErrorLog = lazy(() => import("@/features/diagnostics/pages/ErrorLog"));
const NotFound = lazy(() => import("@/app/routes/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return (
    <AppLayout>
      {/* key=pathname: um crash de render fica contido nesta pagina — o
          menu e o layout continuam de pe, e navegar para outra rota monta um
          ErrorBoundary novo em vez de continuar preso no estado quebrado. */}
      <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
    </AppLayout>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/credit-cards" element={<ProtectedRoute><CreditCards /></ProtectedRoute>} />
        <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
        <Route path="/crypto" element={<ProtectedRoute><Crypto /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/financial-health" element={<ProtectedRoute><FinancialHealth /></ProtectedRoute>} />
        <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><ImportCSV /></ProtectedRoute>} />
        <Route path="/alt-investments" element={<ProtectedRoute><AltInvestments /></ProtectedRoute>} />
        <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/net-worth" element={<ProtectedRoute><NetWorth /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/error-log" element={<ProtectedRoute><ErrorLog /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
