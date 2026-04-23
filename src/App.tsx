import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AccountPage, AuthPage, CarDetailPage, LandingPage } from "./components/rental/ClientUI";
import { AdminCars, AdminClients, AdminDashboard, AdminManagers, AdminReservations, ContractPage, MaintenancePage } from "./components/rental/AdminUI";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cars/:id" element={<CarDetailPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/reservation/:id" element={<AccountPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/cars" element={<AdminCars />} />
          <Route path="/admin/cars/new" element={<AdminCars />} />
          <Route path="/admin/cars/:id" element={<AdminCars />} />
          <Route path="/admin/cars/:id/maintenance" element={<MaintenancePage />} />
          <Route path="/admin/reservations" element={<AdminReservations />} />
          <Route path="/admin/reservations/:id" element={<ContractPage />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/clients/:id" element={<AdminClients />} />
          <Route path="/admin/managers" element={<AdminManagers />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
