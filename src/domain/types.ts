export type HomeworkStatus = 'not_submitted' | 'pending_confirmation' | 'completed';

export type Photo = {
  id: number;
  url: string;
  original_filename: string;
  file_size: number;
  created_at: string;
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
