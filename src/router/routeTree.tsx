import { Route as rootRoute } from './routes/root';

// Pathless layouts
import { Route as publicShellRoute } from './routes/publicShell';
import { Route as appShellRoute } from './routes/appShell';
import { Route as editorShellRoute } from './routes/editorShell';

// Public surface (внутри __publicShell)
import { Route as landingRoute } from './routes/landing';
import { Route as docsRoute } from './routes/docs';
import { Route as docArticleRoute } from './routes/docArticle';
import { Route as guideRoute } from './routes/guide';
import { Route as templatesRoute } from './routes/templates';
import { Route as publicQuizzesRoute } from './routes/publicQuizzes';
import { Route as publicScenarioRoute } from './routes/publicScenario';
import { Route as solutionRoute } from './routes/solution';
import {
  businessRoute,
  businessClientBriefRoute,
  businessLeadQuizRoute,
  businessProductSelectorRoute,
  educationRoute,
  eventsRoute,
  hrAssessmentRoute,
  hrOnboardingRoute,
} from './routes/seoStatic';
import { Route as welcomeRoute } from './routes/welcome';
import { Route as contestRoute } from './routes/contest';
import { Route as contestIndexRoute } from './routes/contestIndex';
import { Route as contestRegistryRoute } from './routes/contestRegistry';

// App surface (внутри __appShell)
import { Route as dashboardRoute } from './routes/dashboard';
import { Route as billingRoute } from './routes/billing';
import { Route as billingReturnRoute } from './routes/billingReturn';

// Admin surface (no public/app shell)
import { Route as adminLoginRoute } from './routes/adminLogin';
import { Route as adminMfaRoute } from './routes/adminMfa';
import { Route as adminShellRoute } from './routes/adminShell';
import { Route as adminDashboardRoute } from './routes/adminDashboard';
import { Route as adminUsersRoute } from './routes/adminUsers';
import { Route as adminQuizzesRoute } from './routes/adminQuizzes';
import { Route as adminReportsRoute } from './routes/adminReports';
import { Route as adminSupportRoute } from './routes/adminSupport';
import { Route as adminFinancesRoute } from './routes/adminFinances';
import { Route as adminPromocodesRoute } from './routes/adminPromocodes';

// Editor surface (внутри __editorShell → __appShell)
import { Route as editorNewRoute } from './routes/editorNew';
import { Route as editorQuizRoute } from './routes/editorQuiz';

// No-shell (полноэкранные / transient)
import { Route as playQuizRoute } from './routes/playQuiz';
import { Route as authConfirmRoute } from './routes/authConfirm';
import { Route as authResetPasswordRoute } from './routes/authResetPassword';

// Catch-all (404)
import { Route as notFoundRoute } from './routes/notFound';

// ─── Route Tree ───────────────────────────────────────────────────────────────
// Legacy query compatibility lives in landingRoute so there is only one
// route matching "/". notFoundRoute remains last.

export const routeTree = rootRoute.addChildren([
  // Public surface
  publicShellRoute.addChildren([
    landingRoute,
    docsRoute,
    docArticleRoute,
    guideRoute,
    templatesRoute,
    publicQuizzesRoute,
    publicScenarioRoute,
    solutionRoute,
    businessRoute,
    businessLeadQuizRoute,
    businessClientBriefRoute,
    businessProductSelectorRoute,
    hrOnboardingRoute,
    hrAssessmentRoute,
    educationRoute,
    eventsRoute,
    welcomeRoute,
    contestRoute.addChildren([
      contestIndexRoute,
      contestRegistryRoute,
    ]),
  ]),

  // Public billing return (вне __appShell — ЮKassa может редиректить без сессии)
  billingReturnRoute,

  // App surface (auth-protected)
  appShellRoute.addChildren([
    dashboardRoute,
    billingRoute,
    editorShellRoute.addChildren([
      editorNewRoute,
      editorQuizRoute,
    ]),
  ]),

  // No-shell (полноэкранные)
  playQuizRoute,
  authConfirmRoute,
  authResetPasswordRoute,
  adminLoginRoute,
  adminMfaRoute,
  adminShellRoute.addChildren([
    adminDashboardRoute,
    adminUsersRoute,
    adminQuizzesRoute,
    adminReportsRoute,
    adminSupportRoute,
    adminFinancesRoute,
    adminPromocodesRoute,
  ]),

  // Catch-all (404) — ВСЕГДА последний
  notFoundRoute,
]);
