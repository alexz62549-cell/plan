import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChildHome } from './ChildHome';
import type { Child, DictationAssignment, HomeworkDay } from '../domain/types';

const children: Child[] = [
  { id: 1, name: '\u5b89\u5b89', display_order: 0 },
  { id: 2, name: '\u4e50\u4e50', display_order: 1 }
];

const day: HomeworkDay = {
  child: children[0],
  date: '2026-07-04',
  subjects: [
    {
      subject: '\u8bed\u6587',
      subject_order: 0,
      items: [
        {
          id: 1,
          child_id: 1,
          child_name: '\u5b89\u5b89',
          date: '2026-07-04',
          subject: '\u8bed\u6587',
          content: '\u9605\u8bfb 20 \u5206\u949f',
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
          child_name: '\u5b89\u5b89',
          date: '2026-07-04',
          subject: '\u8bed\u6587',
          content: '\u4f5c\u6587\u8349\u7a3f',
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
        onLoadDictationAnswers={vi.fn()}
      />
    );

    expect(screen.getByText('\u4f5c\u6587\u8349\u7a3f')).toBeInTheDocument();
    expect(screen.queryByText('\u9605\u8bfb 20 \u5206\u949f')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /\u5df2\u5b8c\u6210 1 \u9879/ }));
    expect(screen.getByText('\u9605\u8bfb 20 \u5206\u949f')).toBeInTheDocument();
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
        onLoadDictationAnswers={vi.fn()}
      />
    );

    const input = screen.getByLabelText('\u9009\u62e9\u7167\u7247\u4f5c\u6587\u8349\u7a3f') as HTMLInputElement;
    const file = new File(['fake'], 'work.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);

    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByText(/\u5f85\u63d0\u4ea4\u7167\u7247/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /\u63d0\u4ea4\u7167\u7247/ }));
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ content: '\u4f5c\u6587\u8349\u7a3f' }), [file]);
  });

  it('opens dictation homework in a standalone page and hides words until answers are requested', async () => {
    const dictationDay: HomeworkDay = {
      child: children[0],
      date: '2026-07-04',
      subjects: [
        {
          subject: '\u5916\u8bed',
          subject_order: 0,
          items: [
            {
              id: 8,
              child_id: 1,
              child_name: '\u5b89\u5b89',
              date: '2026-07-04',
              subject: '\u5916\u8bed',
              content: '\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4',
              is_completed: false,
              status: 'not_submitted',
              photo_count: 0,
              photos: [],
              subject_order: 0,
              item_order: 0,
              dictation: {
                id: 1,
                title: '\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4',
                config: {
                  repeat_each_word: 3,
                  pause_between_repeats_ms: 1200,
                  pause_between_words_ms: 6000,
                  play_hint: false,
                  hint_before_word: true,
                  english_voice: 'en-US-AriaNeural',
                  chinese_voice: 'zh-CN-XiaoxiaoNeural',
                  english_rate: '-5%',
                  chinese_rate: '+0%',
                  generate_audio_on_save: true
                },
                words: [{ index: 0, audio_url: '/uploads/library.mp3' }]
              }
            }
          ]
        }
      ],
      summary: { total: 1, completed: 0, pending: 0 }
    };
    const answers: DictationAssignment = {
      ...dictationDay.subjects[0].items[0].dictation!,
      words: [{ index: 0, audio_url: '/uploads/library.mp3', word: 'library', hint: '\u56fe\u4e66\u9986' }]
    };
    const loadAnswers = vi.fn().mockResolvedValue(answers);

    render(
      <ChildHome
        children={children}
        currentChildId={1}
        date="2026-07-04"
        day={dictationDay}
        onChildChange={vi.fn()}
        onDateChange={vi.fn()}
        onUpload={vi.fn().mockResolvedValue(undefined)}
        onDeletePhoto={vi.fn()}
        onPreview={vi.fn()}
        onLoadDictationAnswers={loadAnswers}
      />
    );

    expect(screen.queryByText('library')).not.toBeInTheDocument();
    expect(screen.queryByText(/\u542c\u5199\u8fdb\u5ea6/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /\u8fdb\u5165\u542c\u5199/ }));
    expect(screen.getByRole('heading', { name: '\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4' })).toBeInTheDocument();
    expect(screen.getByText(/\u542c\u5199\u8fdb\u5ea6/)).toBeInTheDocument();
    expect(screen.getByLabelText('\u9009\u62e9\u7167\u7247\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /\u663e\u793a\u7b54\u6848/ }));

    expect(loadAnswers).toHaveBeenCalledWith(expect.objectContaining({ id: 8 }));
    expect(await screen.findByText('library')).toBeInTheDocument();
  });
});
