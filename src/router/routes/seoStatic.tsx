import { createRoute, notFound } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';
import SolutionPage from '../../../components/solutions/SolutionPage';
import { getSeoPage, type SeoPage } from '../../seo/seoCatalog';

function createStaticSeoRoute(path: string) {
  const route = createRoute({
    getParentRoute: () => publicShellRoute,
    path,
    loader: () => {
      const page = getSeoPage(`${path}/`);
      if (!page) throw notFound();
      return page;
    },
    component: function StaticSeoRoutePage() {
      const page = route.useLoaderData() as SeoPage;
      return <SolutionPage page={page} />;
    },
  });

  return route;
}

export const businessRoute = createStaticSeoRoute('/business');
export const businessLeadQuizRoute = createStaticSeoRoute('/business/lead-quiz');
export const businessClientBriefRoute = createStaticSeoRoute('/business/client-brief');
export const businessProductSelectorRoute = createStaticSeoRoute('/business/product-selector');
export const hrOnboardingRoute = createStaticSeoRoute('/hr/onboarding');
export const hrAssessmentRoute = createStaticSeoRoute('/hr/assessment');
export const educationRoute = createStaticSeoRoute('/education');
export const eventsRoute = createStaticSeoRoute('/events');
