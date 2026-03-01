import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./components/layout/MainLayout";
import { LandingPage } from "./pages/LandingPage";
import { Overview } from "./pages/Overview";
import { Policy } from "./pages/Policy";
import { Settings } from "./pages/Settings";
import { Demo } from "./pages/Demo";

// Placeholder pages for routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col h-full">
    <h1 className="text-2xl font-semibold tracking-tight mb-6">{title}</h1>
    <div className="flex-1 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
      {title} Component Area
    </div>
  </div>
);

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
            <Route path="fleet" element={<Placeholder title="Agent Fleet Command Center" />} />
            <Route path="policy" element={<Policy />} />
            <Route path="audit" element={<Placeholder title="Federated Audit Ledger" />} />
            <Route path="trust" element={<Placeholder title="Trust Topology Graph" />} />
            <Route path="gateways" element={<Placeholder title="Edge Gateways Fleet" />} />
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
