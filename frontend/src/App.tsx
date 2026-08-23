import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import MarketPage from "./pages/MarketPage";
import AssetPage from "./pages/AssetPage";
import WatchlistPage from "./pages/WatchlistPage";
import ActivityPage from "./pages/ActivityPage";
import FundingPage from "./pages/FundingPage";
import LearnPage from "./pages/LearnPage";
import LessonPage from "./pages/LessonPage";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="loading">Loading…</div> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={loading ? <div className="loading">Loading…</div> : user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/portfolio" element={<Protected><PortfolioPage /></Protected>} />
      <Route path="/market" element={<Protected><MarketPage /></Protected>} />
      <Route path="/asset/:symbol" element={<Protected><AssetPage /></Protected>} />
      <Route path="/watchlist" element={<Protected><WatchlistPage /></Protected>} />
      <Route path="/activity" element={<Protected><ActivityPage /></Protected>} />
      <Route path="/funding" element={<Protected><FundingPage /></Protected>} />
      <Route path="/learn" element={<Protected><LearnPage /></Protected>} />
      <Route path="/learn/lesson/:lessonId" element={<Protected><LessonPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
