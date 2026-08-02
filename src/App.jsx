import { useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { KioskProvider } from '@/lib/KioskContext';
import { LayoutThemeProvider } from '@/lib/layoutTheme.jsx';
import { AccessibilityProvider } from '@/lib/AccessibilityContext';
import { SeniorModeProvider } from '@/lib/SeniorModeContext';
import SeniorHome from './pages/senior/SeniorHome';
import SeniorBookRink from './pages/senior/SeniorBookRink';
import SeniorFixtures from './pages/senior/SeniorFixtures';
import SeniorCompetitions from './pages/senior/SeniorCompetitions';
import SeniorMembers from './pages/senior/SeniorMembers';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import BookingsAudit from './pages/BookingsAudit';
import ScorecardHub from './pages/ScorecardHub';
import ScorecardDetail from './pages/ScorecardDetail';
import ScorecardAnalytics from './pages/ScorecardAnalytics';
import EloLeaderboard from './pages/EloLeaderboard';
import CompetitionRegistration from './pages/CompetitionRegistration';
import ClubMessaging from './pages/ClubMessaging';
import MemberDirectory from './pages/MemberDirectory';
import ScorePrediction from './pages/ScorePrediction';
import CompetitionEntriesAdmin from './pages/CompetitionEntriesAdmin';
import HelpCentre from './pages/HelpCentre';
import MemberDashboard from './pages/MemberDashboard';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Log a visit to the login page (unauthenticated visitor redirected to Base44 login)
      try {
        base44.analytics.track({ eventName: 'login_page_visit', properties: { path: window.location.pathname } });
      } catch (e) { /* analytics is best-effort */ }
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/BookingsAudit" element={<LayoutWrapper currentPageName="BookingsAudit"><BookingsAudit /></LayoutWrapper>} />
      <Route path="/ScorecardHub" element={<LayoutWrapper currentPageName="ScorecardHub"><ScorecardHub /></LayoutWrapper>} />
      <Route path="/ScorecardDetail" element={<LayoutWrapper currentPageName="ScorecardDetail"><ScorecardDetail /></LayoutWrapper>} />
      <Route path="/ScorecardAnalytics" element={<LayoutWrapper currentPageName="ScorecardAnalytics"><ScorecardAnalytics /></LayoutWrapper>} />
      <Route path="/EloLeaderboard" element={<LayoutWrapper currentPageName="EloLeaderboard"><EloLeaderboard /></LayoutWrapper>} />
      <Route path="/CompetitionRegistration" element={<LayoutWrapper currentPageName="CompetitionRegistration"><CompetitionRegistration /></LayoutWrapper>} />
      <Route path="/ClubMessaging" element={<LayoutWrapper currentPageName="ClubMessaging"><ClubMessaging /></LayoutWrapper>} />
      <Route path="/MemberDirectory" element={<LayoutWrapper currentPageName="MemberDirectory"><MemberDirectory /></LayoutWrapper>} />
      <Route path="/ScorePrediction" element={<LayoutWrapper currentPageName="ScorePrediction"><ScorePrediction /></LayoutWrapper>} />
      <Route path="/CompetitionEntriesAdmin" element={<LayoutWrapper currentPageName="CompetitionEntriesAdmin"><CompetitionEntriesAdmin /></LayoutWrapper>} />
      <Route path="/HelpCentre" element={<LayoutWrapper currentPageName="HelpCentre"><HelpCentre /></LayoutWrapper>} />
      <Route path="/MemberDashboard" element={<LayoutWrapper currentPageName="MemberDashboard"><MemberDashboard /></LayoutWrapper>} />
      {/* Senior Experience Mode routes — no layout wrapper, they have their own SeniorLayout */}
      <Route path="/SeniorHome" element={<SeniorHome />} />
      <Route path="/SeniorBookRink" element={<SeniorBookRink />} />
      <Route path="/SeniorFixtures" element={<SeniorFixtures />} />
      <Route path="/SeniorCompetitions" element={<SeniorCompetitions />} />
      <Route path="/SeniorMembers" element={<SeniorMembers />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const SHOW_LIVE_CHAT = false;

  useEffect(() => {
    if (!SHOW_LIVE_CHAT || window.Tawk_API) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Hide default widget when loaded
    window.Tawk_API.onLoad = function () {
      window.Tawk_API.hideWidget();
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://embed.tawk.to/69fbab85013fc11c3cb93d54/1jnvhc0hl";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    document.body.appendChild(script);
  }, []);

  return (
    <AuthProvider>
      <KioskProvider>
        <SeniorModeProvider>
        <AccessibilityProvider>
        <LayoutThemeProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>

            {/* ✅ YOUR CUSTOM CHAT BUTTON */}
            {SHOW_LIVE_CHAT && (
            <div
      className="hidden sm:flex fixed bottom-6 right-6 z-50 items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
  onClick={() => window.Tawk_API?.maximize()}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.05)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>

  Live chat
</div>
            )}

            <Toaster />
          </QueryClientProvider>
        </LayoutThemeProvider>
        </AccessibilityProvider>
        </SeniorModeProvider>
      </KioskProvider>
    </AuthProvider>
  )
}

export default App;