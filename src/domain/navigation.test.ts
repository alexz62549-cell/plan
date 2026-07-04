import { describe, expect, it } from 'vitest';

import { getAppModeFromPath } from './navigation';

describe('navigation mode', () => {
  it('uses admin mode only for admin paths', () => {
    expect(getAppModeFromPath('/admin')).toBe('admin');
    expect(getAppModeFromPath('/admin/today')).toBe('admin');
    expect(getAppModeFromPath('/admin/manage')).toBe('admin-manage');
    expect(getAppModeFromPath('/admin/manage/import')).toBe('admin-manage');
    expect(getAppModeFromPath('/')).toBe('child');
    expect(getAppModeFromPath('/anything-else')).toBe('child');
  });
});
