import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminManage } from './AdminManage';
import type { AdminDateResponse } from '../api';
import type { Child, HomeworkItem } from '../domain/types';

const children: Child[] = [
  { id: 1, name: '\u4f55\u6587\u6770', display_order: 0 },
  { id: 2, name: '\u6c88\u9759\u6021', display_order: 1 }
];

const dateData: AdminDateResponse = {
  date: '2026-07-06',
  children: children.map((child) => ({ child, subjects: [] }))
};

function renderManage(childList: Child[], onCreateHomeworks = vi.fn().mockResolvedValue(undefined), planItems: HomeworkItem[] = []) {
  return render(
    <AdminManage
      children={childList}
      password="123456"
      onPasswordChange={vi.fn()}
      date="2026-07-06"
      onDateChange={vi.fn()}
      dateData={dateData}
      planItems={planItems}
      pending={[]}
      importText=""
      onImportTextChange={vi.fn()}
      importPreview={[]}
      importMessage=""
      onPreviewImport={vi.fn()}
      onConfirmImport={vi.fn()}
      onCreateHomeworks={onCreateHomeworks}
      onDeleteHomework={vi.fn()}
      onSetCompleted={vi.fn()}
      onRenameChild={vi.fn()}
      onPreviewPhoto={vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe('AdminManage', () => {
  it('uses the first loaded child for initial manual rows before saving', async () => {
    const onCreateHomeworks = vi.fn().mockResolvedValue(undefined);
    const view = renderManage([], onCreateHomeworks);
    view.rerender(
      <AdminManage
        children={children}
        password="123456"
        onPasswordChange={vi.fn()}
        date="2026-07-06"
        onDateChange={vi.fn()}
        dateData={dateData}
        planItems={[]}
        pending={[]}
        importText=""
        onImportTextChange={vi.fn()}
        importPreview={[]}
        importMessage=""
        onPreviewImport={vi.fn()}
        onConfirmImport={vi.fn()}
        onCreateHomeworks={onCreateHomeworks}
        onDeleteHomework={vi.fn()}
        onSetCompleted={vi.fn()}
        onRenameChild={vi.fn()}
        onPreviewPhoto={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /\u4f5c\u4e1a\u8ba1\u5212/ }));
    await userEvent.type(screen.getAllByPlaceholderText('\u4f5c\u4e1a\u5185\u5bb9')[0], '123');
    await userEvent.click(screen.getByRole('button', { name: /\u6279\u91cf\u6dfb\u52a0/ }));

    expect(onCreateHomeworks).toHaveBeenCalledWith([
      { child_id: 1, date: '2026-07-06', subject: '\u8bed\u6587', content: '123' }
    ]);
  });

  it('saves the selected subject option for manual rows', async () => {
    const onCreateHomeworks = vi.fn().mockResolvedValue(undefined);
    renderManage(children, onCreateHomeworks);

    await userEvent.click(screen.getByRole('button', { name: /\u4f5c\u4e1a\u8ba1\u5212/ }));
    await userEvent.selectOptions(screen.getAllByLabelText(/\u5b66\u79d1/)[0], '\u5916\u8bed');
    await userEvent.type(screen.getAllByPlaceholderText('\u4f5c\u4e1a\u5185\u5bb9')[0], 'listen');
    await userEvent.click(screen.getByRole('button', { name: /\u6279\u91cf\u6dfb\u52a0/ }));

    expect(onCreateHomeworks).toHaveBeenCalledWith([
      { child_id: 1, date: '2026-07-06', subject: '\u5916\u8bed', content: 'listen' }
    ]);
  });

  it('shows plan status without completion actions in the plan overview', async () => {
    const planItems: HomeworkItem[] = [
      {
        id: 101,
        child_id: 1,
        child_name: '\u4f55\u6587\u6770',
        date: '2026-07-06',
        subject: '\u8bed\u6587',
        content: 'read',
        is_completed: false,
        status: 'not_submitted',
        photo_count: 0,
        photos: [],
        subject_order: 0,
        item_order: 0
      }
    ];
    renderManage(children, vi.fn().mockResolvedValue(undefined), planItems);

    await userEvent.click(screen.getByRole('button', { name: /\u4f5c\u4e1a\u8ba1\u5212/ }));

    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\u6807\u8bb0\u5b8c\u6210/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\u6539\u4e3a\u672a\u5b8c\u6210/ })).not.toBeInTheDocument();
  });
});
