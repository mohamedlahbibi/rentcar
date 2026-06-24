import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { LangProvider } from "@/lib/i18n";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";
import { AccountPage, AccountReservationDetail, AuthPage, CarDetailPage, FleetPage, LandingPage, ResetPasswordPage } from "./components/rental/ClientUI";
import {
  AdminCarDetail, AdminCars, AdminClientDetail, AdminClients, AdminDashboard, AdminManagers,
  AdminReservations, ContractPage, MaintenancePage,
} from "./components/rental/AdminUI";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LangProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/cars/:id" element={<CarDetailPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Client only */}
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/account/reservation/:id" element={<ProtectedRoute><AccountReservationDetail /></ProtectedRoute>} />

              {/* Admin / Manager only */}
              <Route path="/admin" element={<ProtectedRoute requireStaff><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/cars" element={<ProtectedRoute requireStaff><AdminCars /></ProtectedRoute>} />
              <Route path="/admin/cars/new" element={<ProtectedRoute requireStaff><AdminCars /></ProtectedRoute>} />
              <Route path="/admin/cars/:id" element={<ProtectedRoute requireStaff><AdminCarDetail /></ProtectedRoute>} />
              <Route path="/admin/cars/:id/maintenance" element={<ProtectedRoute requireStaff><MaintenancePage /></ProtectedRoute>} />
              <Route path="/admin/reservations" element={<ProtectedRoute requireStaff><AdminReservations /></ProtectedRoute>} />
              <Route path="/admin/reservations/:id" element={<ProtectedRoute requireStaff><ContractPage /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute requireStaff><AdminClients /></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute requireStaff><AdminClientDetail /></ProtectedRoute>} />
              <Route path="/admin/managers" element={<ProtectedRoute requireAdmin><AdminManagers /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LangProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
