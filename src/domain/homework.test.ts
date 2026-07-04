import { describe, expect, it } from 'vitest';

import { splitVisibleAndCompleted, summarizeHomework } from './homework';
import type { HomeworkSubjectGroup } from './types';

const groups: HomeworkSubjectGroup[] = [
  {
    subject: '语文',
    subject_order: 0,
    items: [
      {
        id: 1,
        child_id: 1,
        child_name: '安安',
        date: '2026-07-04',
        subject: '语文',
        content: '阅读 20 分钟',
        is_completed: true,
        status: 'completed',
        photo_count: 1,
        photos: [],
        subject_order: 0,
        item_order: 0
      },
      {
        id: 2,
        child_id: 1,
        child_name: '安安',
        date: '2026-07-04',
        subject: '语文',
        content: '作文草稿',
        is_completed: false,
        status: 'pending_confirmation',
        photo_count: 2,
        photos: [],
        subject_order: 0,
        item_order: 1
      }
    ]
  },
  {
    subject: '数学',
    subject_order: 1,
    items: [
      {
        id: 3,
        child_id: 1,
        child_name: '安安',
        date: '2026-07-04',
        subject: '数学',
        content: '口算两页',
        is_completed: true,
        status: 'completed',
        photo_count: 1,
        photos: [],
        subject_order: 1,
        item_order: 0
      }
    ]
  }
];

describe('homework view helpers', () => {
  it('keeps unfinished work grouped by subject and collects completed items separately', () => {
    const result = splitVisibleAndCompleted(groups);

    expect(result.activeGroups).toHaveLength(1);
    expect(result.activeGroups[0].subject).toBe('语文');
    expect(result.activeGroups[0].items.map((item) => item.content)).toEqual(['作文草稿']);
    expect(result.completedItems.map((item) => item.content)).toEqual(['阅读 20 分钟', '口算两页']);
  });

  it('summarizes total, completed, and pending counts', () => {
    expect(summarizeHomework(groups)).toEqual({
      total: 3,
      completed: 2,
      pending: 1,
      notSubmitted: 0
    });
  });
});
