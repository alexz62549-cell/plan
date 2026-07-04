import { Camera, CalendarDays, ChevronDown, ChevronUp, Image as ImageIcon, Lock, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { splitVisibleAndCompleted, statusText, summarizeHomework } from '../domain/homework';
import type { Child, HomeworkDay, HomeworkItem, Photo } from '../domain/types';

type Props = {
  children: Child[];
  currentChildId: number;
  date: string;
  day: HomeworkDay | null;
  loading?: boolean;
  onChildChange: (childId: number) => void;
  onDateChange: (date: string) => void;
  onUpload: (item: HomeworkItem, files: FileList) => void;
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
  const split = useMemo(() => splitVisibleAndCompleted(day?.subjects ?? []), [day]);
  const summary = useMemo(() => summarizeHomework(day?.subjects ?? []), [day]);

  return (
    <section className="child-shell">
      <header className="child-topbar">
        <div>
          <p className="mini-label">暑假作业</p>
          <h1>暑假打卡</h1>
        </div>
        <label className="select-wrap">
          <span>孩子</span>
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
          已完成 {summary.completed} / 共 {summary.total} 项
        </div>
      </div>

      {loading ? <div className="empty-state">正在加载...</div> : null}

      {!loading && day && summary.total === 0 ? <div className="empty-state">这天没有作业</div> : null}

      <div className="subject-list">
        {split.activeGroups.map((group) => (
          <section className="subject-section" key={group.subject}>
            <div className="subject-title">
              <h2>{group.subject}</h2>
              <span>{group.items.length} 项</span>
            </div>
            <div className="item-list">
              {group.items.map((item) => (
                <HomeworkCard
                  key={item.id}
                  item={item}
                  onUpload={onUpload}
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
            <span>已完成 {split.completedItems.length} 项</span>
            {completedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {completedOpen ? (
            <div className="item-list">
              {split.completedItems.map((item) => (
                <HomeworkCard
                  key={item.id}
                  item={item}
                  onUpload={onUpload}
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
  onUpload,
  onDeletePhoto,
  onPreview
}: {
  item: HomeworkItem;
  onUpload: (item: HomeworkItem, files: FileList) => void;
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
            <ImageIcon size={14} /> {item.photo_count} 张照片
          </p>
        </div>
        {locked ? (
          <div className="lock-chip">
            <Lock size={15} /> 已锁定
          </div>
        ) : (
          <label className="upload-button">
            <Camera size={17} />
            拍照上传
            <input
              aria-label={`上传${item.content}`}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => {
                if (event.target.files?.length) onUpload(item, event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>
        )}
      </div>
      {item.photos.length > 0 ? (
        <div className="thumb-strip">
          {item.photos.map((photo, index) => (
            <div className="thumb" key={photo.id}>
              <button type="button" onClick={() => onPreview(item.photos, index, item)}>
                <img src={photo.url} alt={photo.original_filename} />
              </button>
              {!locked ? (
                <button className="thumb-delete" type="button" onClick={() => onDeletePhoto(photo)} aria-label="删除照片">
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
