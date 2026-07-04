export type AppMode = 'child' | 'admin';

export function getAppModeFromPath(pathname: string): AppMode {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'child';
}
