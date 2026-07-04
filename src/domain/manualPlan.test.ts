import { describe, expect, it } from 'vitest';

import { normalizeManualPlanRows } from './manualPlan';

describe('manual plan rows', () => {
  it('keeps valid rows and ignores empty content rows', () => {
    const rows = normalizeManualPlanRows([
      { child_id: 1, date: '2026-07-10', subject: '语文', content: '阅读 20 分钟' },
      { child_id: 1, date: '2026-07-10', subject: '数学', content: '' }
    ]);

    expect(rows).toEqual([{ child_id: 1, date: '2026-07-10', subject: '语文', content: '阅读 20 分钟' }]);
  });

  it('reports rows missing required date subject or child', () => {
    expect(() =>
      normalizeManualPlanRows([{ child_id: 0, date: '', subject: '', content: '口算 2 页' }])
    ).toThrow('请补全第 1 行的孩子、日期、学科和内容');
  });
});
