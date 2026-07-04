import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChildHome } from './ChildHome';
import type { Child, HomeworkDay } from '../domain/types';

const children: Child[] = [
  { id: 1, name: '安安', display_order: 0 },
  { id: 2, name: '乐乐', display_order: 1 }
];

const day: HomeworkDay = {
  child: children[0],
  date: '2026-07-04',
  subjects: [
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
    }
  ],
  summary: { total: 2, completed: 1, pending: 1 }
};

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:test-photo'),
    revokeObjectURL: vi.fn()
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChildHome', () => {
  it('shows active homework by subject and keeps completed homework collapsed', async () => {
    render(
      <ChildHome
        children={children}
        currentChildId={1}
        date="2026-07-04"
        day={day}
        onChildChange={vi.fn()}
        onDateChange={vi.fn()}
        onUpload={vi.fn().mockResolvedValue(undefined)}
        onDeletePhoto={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(screen.getByText('作文草稿')).toBeInTheDocument();
    expect(screen.queryByText('阅读 20 分钟')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /已完成 1 项/ }));
    expect(screen.getByText('阅读 20 分钟')).toBeInTheDocument();
  });

  it('requires submitting selected photos before upload is called', async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    render(
      <ChildHome
        children={children}
        currentChildId={1}
        date="2026-07-04"
        day={day}
        onChildChange={vi.fn()}
        onDateChange={vi.fn()}
        onUpload={upload}
        onDeletePhoto={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    const input = screen.getByLabelText('选择照片作文草稿') as HTMLInputElement;
    const file = new File(['fake'], 'work.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);

    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByText(/待提交照片/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /提交照片/ }));
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ content: '作文草稿' }), [file]);
  });
});
