import { Router, type Route } from '@vaadin/router';
import { store } from './store';

export function configureRouter(outlet: HTMLElement) {
  const router = new Router<object, object>(outlet);
  const routes: Route[] = [
    {
      path: '/login',
      component: 'login-page',
      action: (_context, commands) =>
        store.user ? commands.redirect('/dashboard') : undefined,
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '/devices',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '/zones',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user?.role === 'admin'
          ? undefined
          : commands.redirect(store.user ? '/dashboard' : '/login'),
    },
    {
      path: '/devices/:deviceId/history',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '/devices/:deviceId',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '/alerts',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '/users',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user?.role === 'admin'
          ? undefined
          : commands.redirect(store.user ? '/dashboard' : '/login'),
    },
    {
      path: '/profile',
      component: 'app-shell',
      action: (_context, commands) =>
        store.user ? undefined : commands.redirect('/login'),
    },
    {
      path: '(.*)',
      action: (_context, commands) =>
        commands.redirect(store.user ? '/dashboard' : '/login'),
    },
  ];
  router.setRoutes(routes);
  return router;
}
