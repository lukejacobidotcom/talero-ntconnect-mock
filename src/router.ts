import type { Handler, Route } from './types';
const routes: Route[] = [];
export function route(method: 'GET' | 'POST', path: string, handler: Handler): void {
  routes.push({ method, path, handler });
}
export function getRoutes(): Route[] { return routes; }
