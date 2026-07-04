import { Camera, CalendarDays, ChevronDown, ChevronUp, Image as ImageIcon, Lock, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { splitVisibleAndCompleted, statusText, summarizeHomework } from '../domain/homework';
import type { Child, HomeworkDay, HomeworkItem, Photo } from '../domain/types';

const C = {
  label: '\u6691\u5047\u4f5c\u4e1a',
  title: '\u6691\u5047\u6253\u5361',
  child: '\u5b69\u5b50',
  completed: '\u5df2\u5b8c\u6210',
  total: '\u5171',
  itemUnit: '\u9879',
  loading: '\u6b63\u5728\u52a0\u8f7d...',
  noHomework: '\u8fd9\u5929\u6ca1\u6709\u4f5c\u4e1a',
  photoUnit: '\u5f20\u7167\u7247',
  pickPhoto: '\u9009\u62e9\u7167\u7247',
  submitPhotos: '\u63d0\u4ea4\u7167\u7247',
  pendingPhotos: '\u5f85\u63d0\u4ea4\u7167\u7247',
  locked: '\u5df2\u9501\u5b9a',
  deletePhoto: '\u5220\u9664\u7167\u7247'
};

type PendingPhoto = {
  file: File;
  url: string;
};

type Props = {
  children: Child[];
  currentChildId: number;
  date: string;
  day: HomeworkDay | null;
  loading?: boolean;
  onChildChange: (childId: number) => void;
  onDateChange: (date: string) => void;
  onUpload: (item: HomeworkItem, files: File[]) => Promise<void>;
  onDeletePhoto: (photo: Photo) => void;
  onPreview: (photos: Photo[], index: number, item?: HomeworkItem) => void;
};

export function ChildHome({
  children,
  currentChildId,
  date,
  day,
  loading,
  onChildChange,
  onDateChange,
  onUpload,
  onDeletePhoto,
  onPreview
}: Props) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const [pendingByItem, setPendingByItem] = useState<Record<number, PendingPhoto[]>>({});
  const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
  const split = useMemo(() => splitVisibleAndCompleted(day?.subjects ?? []), [day]);
  const summary = useMemo(() => summarizeHomework(day?.subjects ?? []), [day]);

  const addPending = (item: HomeworkItem, files: FileList) => {
    const nextPhotos = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPendingByItem((value) => ({ ...value, [item.id]: [...(value[item.id] ?? []), ...nextPhotos] }));
  };

  const removePending = (item: HomeworkItem, index: number) => {
    setPendingByItem((value) => {
      const existing = value[item.id] ?? [];
      URL.revokeObjectURL(existing[index]?.url ?? '');
      const next = existing.filter((_, itemIndex) => itemIndex !== index);
      return { ...value, [item.id]: next };
    });
  };

  const submitPending = async (item: HomeworkItem) => {
    const pending = pendingByItem[item.id] ?? [];
    if (pending.length === 0) return;
    setSubmittingItemId(item.id);
    try {
      await onUpload(
        item,
        pending.map((photo) => photo.file)
      );
      pending.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPendingByItem((value) => ({ ...value, [item.id]: [] }));
    } finally {
      setSubmittingItemId(null);
    }
  };

  return (
    <section className="child-shell">
      <header className="child-topbar">
        <div>
          <p className="mini-label">{C.label}</p>
          <h1>{C.title}</h1>
        </div>
        <label className="select-wrap">
          <span>{C.child}</span>
          <select value={currentChildId} onChange={(event) => onChildChange(Number(event.target.value))}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="date-card">
        <CalendarDays size={18} />
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        <div className="summary-pill">
          {C.completed} {summary.completed} / {C.total} {summary.total} {C.itemUnit}
        </div>
      </div>

      {loading ? <div className="empty-state">{C.loading}</div> : null}
      {!loading && day && summary.total === 0 ? <div className="empty-state">{C.noHomework}</div> : null}

      <div className="subject-list">
        {split.activeGroups.map((group) => (
          <section className="subject-section" key={group.subject}>
            <div className="subject-title">
              <h2>{group.subject}</h2>
              <span>
                {group.items.length} {C.itemUnit}
              </span>
            </div>
            <div className="item-list">
              {group.items.map((item) => (
                <HomeworkCard
                  key={item.id}
                  item={item}
                  pendingPhotos={pendingByItem[item.id] ?? []}
                  submitting={submittingItemId === item.id}
                  onPickPhotos={addPending}
                  onRemovePending={removePending}
                  onSubmit={submitPending}
                  onDeletePhoto={onDeletePhoto}
                  onPreview={onPreview}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {split.completedItems.length > 0 ? (
        <section className="completed-block">
          <button className="completed-toggle" type="button" onClick={() => setCompletedOpen((value) => !value)}>
            <span>
              {C.completed} {split.completedItems.length} {C.itemUnit}
            </span>
            {completedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {completedOpen ? (
            <div className="item-list">
              {split.completedItems.map((item) => (
                <HomeworkCard
                  key={item.id}
                  item={item}
                  pendingPhotos={[]}
                  submitting={false}
                  onPickPhotos={addPending}
                  onRemovePending={removePending}
                  onSubmit={submitPending}
                  onDeletePhoto={onDeletePhoto}
                  onPreview={onPreview}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function HomeworkCard({
  item,
  pendingPhotos,
  submitting,
  onPickPhotos,
  onRemovePending,
  onSubmit,
  onDeletePhoto,
  onPreview
}: {
  item: HomeworkItem;
  pendingPhotos: PendingPhoto[];
  submitting: boolean;
  onPickPhotos: (item: HomeworkItem, files: FileList) => void;
  onRemovePending: (item: HomeworkItem, index: number) => void;
  onSubmit: (item: HomeworkItem) => void;
  onDeletePhoto: (photo: Photo) => void;
  onPreview: (photos: Photo[], index: number, item?: HomeworkItem) => void;
}) {
  const locked = item.status === 'completed';

  return (
    <article className={`homework-card ${item.status}`}>
      <div className="homework-main">
        <div>
          <span className={`status-badge ${item.status}`}>{statusText(item.status)}</span>
          <h3>{item.content}</h3>
          <p>
            <ImageIcon size={14} /> {item.photo_count} {C.photoUnit}
          </p>
        </div>
        {locked ? (
          <div className="lock-chip">
            <Lock size={15} /> {C.locked}
          </div>
        ) : (
          <label className="upload-button secondary-upload">
            <Camera size={17} />
            {C.pickPhoto}
            <input
              aria-label={`${C.pickPhoto}${item.content}`}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => {
                if (event.target.files?.length) onPickPhotos(item, event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>
        )}
      </div>

      {pendingPhotos.length > 0 ? (
        <div className="pending-upload-box">
          <div className="pending-upload-title">
            <span>
              {C.pendingPhotos} {pendingPhotos.length} {C.photoUnit}
            </span>
            <button className="submit-photos-button" type="button" onClick={() => onSubmit(item)} disabled={submitting}>
              <Send size={15} /> {submitting ? C.loading : C.submitPhotos}
            </button>
          </div>
          <div className="thumb-strip">
            {pendingPhotos.map((photo, index) => (
              <div className="thumb" key={`${photo.url}-${index}`}>
                <button type="button">
                  <img src={photo.url} alt={photo.file.name} />
                </button>
                <button className="thumb-delete" type="button" onClick={() => onRemovePending(item, index)} aria-label={C.deletePhoto}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {item.photos.length > 0 ? (
        <div className="thumb-strip">
          {item.photos.map((photo, index) => (
            <div className="thumb" key={photo.id}>
              <button type="button" onClick={() => onPreview(item.photos, index, item)}>
                <img src={photo.url} alt={photo.original_filename} />
              </button>
              {!locked ? (
                <button className="thumb-delete" type="button" onClick={() => onDeletePhoto(photo)} aria-label={C.deletePhoto}>
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
