export type HomeworkStatus = 'not_submitted' | 'pending_confirmation' | 'completed';

export type Photo = {
  id: number;
  url: string;
  original_filename: string;
  file_size: number;
  created_at: string;
};

export type DictationConfig = {
  repeat_each_word: number;
  pause_between_repeats_ms: number;
  pause_between_words_ms: number;
  play_hint: boolean;
  hint_before_word: boolean;
  english_voice: string;
  chinese_voice: string;
  english_rate: string;
  chinese_rate: string;
  generate_audio_on_save: boolean;
};

export type DictationWord = {
  index: number;
  audio_url: string | null;
  word?: string;
  hint?: string | null;
};

export type DictationAssignment = {
  id: number;
  title: string;
  config: DictationConfig;
  words: DictationWord[];
};

export type HomeworkItem = {
  id: number;
  child_id: number;
  child_name: string;
  date: string;
  subject: string;
  content: string;
  is_completed: boolean;
  status: HomeworkStatus;
  photo_count: number;
  photos: Photo[];
  subject_order: number;
  item_order: number;
  dictation?: DictationAssignment;
};

export type HomeworkSubjectGroup = {
  subject: string;
  subject_order: number;
  items: HomeworkItem[];
};

export type Child = {
  id: number;
  name: string;
  display_order: number;
};

export type HomeworkDay = {
  child: Child;
  date: string;
  subjects: HomeworkSubjectGroup[];
  summary: {
    total: number;
    completed: number;
    pending: number;
  };
};

export type HomeworkSummary = {
  total: number;
  completed: number;
  pending: number;
  notSubmitted: number;
};
