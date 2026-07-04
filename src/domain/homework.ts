import type { HomeworkItem, HomeworkSubjectGroup, HomeworkSummary } from './types';

export function splitVisibleAndCompleted(groups: HomeworkSubjectGroup[]) {
  const activeGroups: HomeworkSubjectGroup[] = [];
  const completedItems: HomeworkItem[] = [];

  for (const group of groups) {
    const activeItems = group.items.filter((item) => item.status !== 'completed');
    completedItems.push(...group.items.filter((item) => item.status === 'completed'));
    if (activeItems.length > 0) {
      activeGroups.push({ ...group, items: activeItems });
    }
  }

  return { activeGroups, completedItems };
}

export function summarizeHomework(groups: HomeworkSubjectGroup[]): HomeworkSummary {
  const items = groups.flatMap((group) => group.items);
  const completed = items.filter((item) => item.status === 'completed').length;
  const pending = items.filter((item) => item.status === 'pending_confirmation').length;

  return {
    total: items.length,
    completed,
    pending,
    notSubmitted: items.length - completed - pending
  };
}

export function statusText(status: HomeworkItem['status']) {
  if (status === 'completed') return '已完成';
  if (status === 'pending_confirmation') return '待确认';
  return '未提交';
}
