import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./components/layout/MainLayout";
import { LandingPage } from "./pages/LandingPage";
import { Overview } from "./pages/Overview";
import { Policy } from "./pages/Policy";
import { Approvals } from "./pages/Approvals";
import { Settings } from "./pages/Settings";
import { Demo } from "./pages/Demo";
import { Fleet } from "./pages/Fleet";
import { TrustTopology } from "./pages/TrustTopology";
import { Gateways } from "./pages/Gateways";
import { AuditLedger } from "./pages/AuditLedger";
import { QICacheAnalytics } from "./pages/QICacheAnalytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing page — marketing entry point */}
          <Route path="/" element={<LandingPage />} />

          {/* Dashboard — protected app shell */}
          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={<Overview />} />
            <Route path="fleet" element={<Fleet />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="policy" element={<Policy />} />
            <Route path="audit" element={<AuditLedger />} />
            <Route path="cache" element={<QICacheAnalytics />} />
            <Route path="trust" element={<TrustTopology />} />
            <Route path="gateways" element={<Gateways />} />
            <Route path="demo" element={<Demo />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
