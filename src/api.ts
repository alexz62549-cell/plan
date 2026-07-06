import type { Child, DictationAssignment, HomeworkDay, HomeworkItem } from './domain/types';

export type AdminDateResponse = {
  date: string;
  children: Array<{
    child: Child;
    subjects: HomeworkDay['subjects'];
  }>;
};

export type AdminMonthDay = {
  date: string;
  total: number;
  completed: number;
  pending: number;
};

export type AdminMonthResponse = {
  year: number;
  month: number;
  days: AdminMonthDay[];
};

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail || response.statusText);
  }
  return response.json() as Promise<T>;
}

export function adminHeaders(password: string) {
  return {
    'Content-Type': 'application/json',
    'x-admin-password': password
  };
}

export const api = {
  children: () => requestJson<Child[]>('/api/children'),
  updateChild: (childId: number, name: string, password: string) =>
    requestJson<Child>(`/api/admin/children/${childId}`, {
      method: 'PATCH',
      headers: adminHeaders(password),
      body: JSON.stringify({ name })
    }),
  homework: (childId: number, date: string) =>
    requestJson<HomeworkDay>(`/api/homework?childId=${childId}&date=${date}`),
  uploadPhoto: (itemId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return requestJson(`/api/homework/${itemId}/photos`, {
      method: 'POST',
      body: form
    });
  },
  deletePhoto: (photoId: number) =>
    requestJson(`/api/photos/${photoId}`, {
      method: 'DELETE'
    }),
  adminDate: (date: string, password: string) =>
    requestJson<AdminDateResponse>(`/api/admin/date?date=${date}`, {
      headers: { 'x-admin-password': password }
    }),
  adminMonth: (year: number, month: number, password: string) =>
    requestJson<AdminMonthResponse>(`/api/admin/month?year=${year}&month=${month}`, {
      headers: { 'x-admin-password': password }
    }),
  adminPlan: (start: string, end: string, password: string) =>
    requestJson<HomeworkItem[]>(`/api/admin/plan?start=${start}&end=${end}`, {
      headers: { 'x-admin-password': password }
    }),
  pending: (password: string) =>
    requestJson<HomeworkItem[]>('/api/admin/pending', {
      headers: { 'x-admin-password': password }
    }),
  setCompleted: (itemId: number, isCompleted: boolean, password: string) =>
    requestJson<HomeworkItem>(`/api/admin/homework/${itemId}/completion`, {
      method: 'PATCH',
      headers: adminHeaders(password),
      body: JSON.stringify({ is_completed: isCompleted })
    }),
  createHomework: (
    payload: { child_id: number; date: string; subject: string; content: string },
    password: string
  ) =>
    requestJson<HomeworkItem>('/api/admin/homework', {
      method: 'POST',
      headers: adminHeaders(password),
      body: JSON.stringify(payload)
    }),
  createDictation: (
    payload: {
      child_id: number;
      date: string;
      title: string;
      words: Array<{ word: string; hint?: string }>;
    },
    password: string
  ) =>
    requestJson<HomeworkItem>('/api/admin/dictation', {
      method: 'POST',
      headers: adminHeaders(password),
      body: JSON.stringify(payload)
    }),
  dictationAnswers: (itemId: number) => requestJson<DictationAssignment>(`/api/dictation/${itemId}/answers`),
  deleteHomework: (itemId: number, password: string) =>
    requestJson(`/api/admin/homework/${itemId}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    }),
  importPreview: (payload: unknown) =>
    requestJson<{ valid: boolean; item_count: number; rows: Array<Record<string, unknown>> }>(
      '/api/admin/import/preview',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    ),
  importPlan: (payload: unknown, password: string) =>
    requestJson<{ created: number }>('/api/admin/import', {
      method: 'POST',
      headers: adminHeaders(password),
      body: JSON.stringify(payload)
    })
};
