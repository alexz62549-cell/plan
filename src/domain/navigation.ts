export type AppMode = 'child' | 'admin' | 'admin-manage';

export function getAppModeFromPath(pathname: string): AppMode {
  if (pathname === '/admin/manage' || pathname.startsWith('/admin/manage/')) return 'admin-manage';
  return pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'child';
}
