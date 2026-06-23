import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md p-8">
        <h1 className="text-7xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Страница не найдена
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Возможно, ссылка устарела или страница была перемещена.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
