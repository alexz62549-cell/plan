import type { HomeworkItem } from './types';

export type PlanSubjectGroup = {
  subject: string;
  items: HomeworkItem[];
};

export type PlanChildGroup = {
  childId: number;
  childName: string;
  total: number;
  subjects: PlanSubjectGroup[];
};

export type PlanDateGroup = {
  date: string;
  total: number;
  completed: number;
  pending: number;
  children: PlanChildGroup[];
};

export function groupPlanTimeline(items: HomeworkItem[]): PlanDateGroup[] {
  const sorted = [...items].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.child_id - b.child_id ||
      a.subject_order - b.subject_order ||
      a.subject.localeCompare(b.subject) ||
      a.item_order - b.item_order ||
      a.id - b.id
  );
  const dates = new Map<string, PlanDateGroup>();

  for (const item of sorted) {
    let dateGroup = dates.get(item.date);
    if (!dateGroup) {
      dateGroup = { date: item.date, total: 0, completed: 0, pending: 0, children: [] };
      dates.set(item.date, dateGroup);
    }
    dateGroup.total += 1;
    if (item.is_completed) dateGroup.completed += 1;
    if (item.status === 'pending_confirmation') dateGroup.pending += 1;

    let childGroup = dateGroup.children.find((child) => child.childId === item.child_id);
    if (!childGroup) {
      childGroup = { childId: item.child_id, childName: item.child_name, total: 0, subjects: [] };
      dateGroup.children.push(childGroup);
    }
    childGroup.total += 1;

    let subjectGroup = childGroup.subjects.find((subject) => subject.subject === item.subject);
    if (!subjectGroup) {
      subjectGroup = { subject: item.subject, items: [] };
      childGroup.subjects.push(subjectGroup);
    }
    subjectGroup.items.push(item);
  }

  return Array.from(dates.values());
}
