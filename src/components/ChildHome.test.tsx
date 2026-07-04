import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
        onUpload={vi.fn()}
        onDeletePhoto={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(screen.getByText('作文草稿')).toBeInTheDocument();
    expect(screen.queryByText('阅读 20 分钟')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /已完成 1 项/ }));
    expect(screen.getByText('阅读 20 分钟')).toBeInTheDocument();
  });
});
