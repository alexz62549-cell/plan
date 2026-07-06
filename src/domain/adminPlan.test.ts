import { describe, expect, it } from 'vitest';

import { groupPlanTimeline } from './adminPlan';
import type { HomeworkItem } from './types';

const childA = '\u5b89\u5b89';
const childB = '\u4e50\u4e50';
const chinese = '\u8bed\u6587';
const math = '\u6570\u5b66';
const read = '\u9605\u8bfb';
const calc = '\u8ba1\u7b97';
const oralCalc = '\u53e3\u7b97';

function item(patch: Partial<HomeworkItem>): HomeworkItem {
  return {
    id: patch.id ?? 1,
    child_id: patch.child_id ?? 1,
    child_name: patch.child_name ?? childA,
    date: patch.date ?? '2026-07-04',
    subject: patch.subject ?? chinese,
    content: patch.content ?? read,
    is_completed: patch.is_completed ?? false,
    status: patch.status ?? 'not_submitted',
    photo_count: patch.photo_count ?? 0,
    photos: patch.photos ?? [],
    subject_order: patch.subject_order ?? 0,
    item_order: patch.item_order ?? 0
  };
}

describe('groupPlanTimeline', () => {
  it('groups homework by date, child, and subject in timeline order', () => {
    const groups = groupPlanTimeline([
      item({ id: 3, date: '2026-07-05', child_id: 2, child_name: childB, subject: math, content: oralCalc }),
      item({ id: 1, date: '2026-07-04', child_id: 1, child_name: childA, subject: chinese, content: read, subject_order: 0 }),
      item({ id: 2, date: '2026-07-04', child_id: 1, child_name: childA, subject: math, content: calc, subject_order: 1 })
    ]);

    expect(groups).toEqual([
      {
        date: '2026-07-04',
        total: 2,
        completed: 0,
        pending: 0,
        children: [
          {
            childId: 1,
            childName: childA,
            total: 2,
            subjects: [
              { subject: chinese, items: [expect.objectContaining({ content: read })] },
              { subject: math, items: [expect.objectContaining({ content: calc })] }
            ]
          }
        ]
      },
      {
        date: '2026-07-05',
        total: 1,
        completed: 0,
        pending: 0,
        children: [
          {
            childId: 2,
            childName: childB,
            total: 1,
            subjects: [{ subject: math, items: [expect.objectContaining({ content: oralCalc })] }]
          }
        ]
      }
    ]);
  });
});
