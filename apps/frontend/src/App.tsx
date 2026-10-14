import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { RequireAuth } from "@/routes/RequireAuth";
import { RedirectIfAuthed } from "@/routes/RedirectIfAuthed";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { GoogleMapsKeyGuidePage } from "@/pages/GoogleMapsKeyGuidePage";
import { TripsPage } from "@/pages/TripsPage";
import { NewTripPage } from "@/pages/NewTripPage";
import { TripDetailPage } from "@/pages/TripDetailPage";
import { ItineraryPage } from "@/pages/ItineraryPage";
import { ItineraryComparePage } from "@/pages/ItineraryComparePage";
import { SharePage } from "@/pages/SharePage";
import { TodayPage } from "@/pages/TodayPage";
import { InvitePage } from "@/pages/InvitePage";

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route element={<RedirectIfAuthed />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/help/google-maps-key" element={<GoogleMapsKeyGuidePage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/trips/new" element={<NewTripPage />} />
              <Route path="/trips/:id" element={<TripDetailPage />} />
              <Route path="/trips/:id/itinerary" element={<ItineraryPage />} />
              <Route path="/trips/:id/today" element={<TodayPage />} />
              <Route path="/trips/:id/itinerary/compare" element={<ItineraryComparePage />} />
            </Route>
          </Route>

          <Route path="/share/:slug" element={<SharePage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
