import { CalendarDays, Check, ChevronLeft, ChevronRight, Image as ImageIcon, ListChecks, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

import type { AdminDateResponse, AdminMonthResponse } from '../api';
import { shiftDate, todayString } from '../domain/dateNav';
import { statusText } from '../domain/homework';
import type { Child, HomeworkItem, Photo } from '../domain/types';

const L = {
  appTitle: '\u5bb6\u957f\u7aef',
  subTitle: '\u67e5\u770b\u6bcf\u5929\u5b8c\u6210\u60c5\u51b5\u548c\u5ba1\u6838\u7167\u7247',
  overview: '\u6708\u5ea6\u6982\u89c8',
  todayList: '\u5f53\u65e5\u4f5c\u4e1a',
  pending: '\u5f85\u5ba1\u6838',
  previousDay: '\u524d\u4e00\u5929',
  nextDay: '\u540e\u4e00\u5929',
  today: '\u4eca\u5929',
  password: '\u5bb6\u957f\u5bc6\u7801',
  defaultPassword: '\u9ed8\u8ba4 123456',
  noHomework: '\u8fd9\u5929\u6ca1\u6709\u4f5c\u4e1a',
  noPending: '\u6682\u65e0\u5f85\u5ba1\u6838\u7167\u7247',
  completed: '\u5df2\u5b8c\u6210',
  total: '\u5171',
  pendingShort: '\u5f85\u5ba1',
  photoUnit: '\u5f20\u7167\u7247',
  markCompleted: '\u786e\u8ba4\u5b8c\u6210',
  markIncomplete: '\u6539\u4e3a\u672a\u5b8c\u6210',
  noPhoto: '\u6682\u65e0\u7167\u7247',
  monthTotal: '\u672c\u6708\u4f5c\u4e1a',
  monthCompleted: '\u672c\u6708\u5b8c\u6210',
  monthPending: '\u5f85\u5ba1\u7167\u7247',
  manageLink: '\u4f5c\u4e1a\u7ba1\u7406',
  weekday: ['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d']
};

type Props = {
  children: Child[];
  password: string;
  onPasswordChange: (password: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  dateData: AdminDateResponse | null;
  monthData: AdminMonthResponse | null;
  pending: HomeworkItem[];
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
};

type CalendarCell = {
  key: string;
  date?: string;
  day?: number;
  total: number;
  completed: number;
  pending: number;
};

export function AdminHome({
  password,
  onPasswordChange,
  date,
  onDateChange,
  dateData,
  monthData,
  pending,
  onSetCompleted,
  onPreviewPhoto
}: Props) {
  const calendarCells = useMemo(() => buildCalendarCells(date, monthData), [date, monthData]);
  const dayItems = useMemo(() => dateData?.children.flatMap((childBlock) => childBlock.subjects.flatMap((group) => group.items)) ?? [], [dateData]);
  const monthSummary = useMemo(
    () =>
      monthData?.days.reduce(
        (summary, day) => ({
          total: summary.total + day.total,
          completed: summary.completed + day.completed,
          pending: summary.pending + day.pending
        }),
        { total: 0, completed: 0, pending: 0 }
      ) ?? { total: 0, completed: 0, pending: 0 },
    [monthData]
  );

  return (
    <section className="admin-mobile-shell">
      <header className="admin-mobile-header">
        <div>
          <p className="mini-label">Parent Admin</p>
          <h1>{L.appTitle}</h1>
          <p>{L.subTitle}</p>
        </div>
        <div className="admin-header-actions">
          <a className="admin-mode-link" href="/admin/manage">
            {L.manageLink}
          </a>
          <label className="admin-password compact-password">
            {L.password}
            <input value={password} type="password" placeholder={L.defaultPassword} onChange={(event) => onPasswordChange(event.target.value)} />
          </label>
        </div>
      </header>

      <DateNavigator date={date} onDateChange={onDateChange} />

      <section className="admin-summary-grid">
        <Metric label={L.monthTotal} value={monthSummary.total} />
        <Metric label={L.monthCompleted} value={monthSummary.completed} />
        <Metric label={L.monthPending} value={pending.length} />
      </section>

      <section className="admin-card-section">
        <div className="section-heading">
          <h2>{L.overview}</h2>
          <span>
            {monthData?.year ?? date.slice(0, 4)}-{String(monthData?.month ?? Number(date.slice(5, 7))).padStart(2, '0')}
          </span>
        </div>
        <div className="calendar-grid" aria-label={L.overview}>
          {L.weekday.map((weekday) => (
            <div className="calendar-weekday" key={weekday}>
              {weekday}
            </div>
          ))}
          {calendarCells.map((cell) =>
            cell.date ? (
              <button className={`calendar-day ${cell.date === date ? 'selected' : ''}`} type="button" key={cell.key} onClick={() => onDateChange(cell.date ?? date)}>
                <strong>{cell.day}</strong>
                {cell.total > 0 ? (
                  <span>
                    {cell.completed}/{cell.total}
                  </span>
                ) : (
                  <span className="empty-dot">-</span>
                )}
                {cell.pending > 0 ? <em>{cell.pending}</em> : null}
              </button>
            ) : (
              <div className="calendar-day placeholder" key={cell.key} />
            )
          )}
        </div>
      </section>

      <section className="admin-card-section">
        <div className="section-heading">
          <h2>{L.pending}</h2>
          <span>{pending.length}</span>
        </div>
        <div className="admin-review-list">
          {pending.length === 0 ? <p className="muted">{L.noPending}</p> : null}
          {pending.map((item) => (
            <AdminReviewCard key={item.id} item={item} primary onSetCompleted={onSetCompleted} onPreviewPhoto={onPreviewPhoto} />
          ))}
        </div>
      </section>

      <section className="admin-card-section">
        <div className="section-heading">
          <h2>{L.todayList}</h2>
          <span>
            {L.completed} {dayItems.filter((item) => item.is_completed).length} / {L.total} {dayItems.length}
          </span>
        </div>
        <div className="admin-review-list">
          {dateData?.children.map((childBlock) => (
            <div className="child-day-block" key={childBlock.child.id}>
              <h3>{childBlock.child.name}</h3>
              {childBlock.subjects.length === 0 ? <p className="muted">{L.noHomework}</p> : null}
              {childBlock.subjects.map((group) => (
                <div className="admin-subject" key={`${childBlock.child.id}-${group.subject}`}>
                  <div className="admin-subject-title">{group.subject}</div>
                  {group.items.map((item) => (
                    <AdminReviewCard key={item.id} item={item} onSetCompleted={onSetCompleted} onPreviewPhoto={onPreviewPhoto} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildCalendarCells(date: string, monthData: AdminMonthResponse | null): CalendarCell[] {
  const [year, month] = date.split('-').map(Number);
  const statsByDate = new Map((monthData?.days ?? []).map((day) => [day.date, day]));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `blank-${index}`, total: 0, completed: 0, pending: 0 });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const stats = statsByDate.get(cellDate);
    cells.push({
      key: cellDate,
      date: cellDate,
      day,
      total: stats?.total ?? 0,
      completed: stats?.completed ?? 0,
      pending: stats?.pending ?? 0
    });
  }
  return cells;
}

function DateNavigator({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  return (
    <div className="date-navigator mobile-date-nav">
      <button type="button" aria-label={L.previousDay} onClick={() => onDateChange(shiftDate(date, -1))}>
        <ChevronLeft size={17} />
      </button>
      <button type="button" onClick={() => onDateChange(todayString())}>
        {L.today}
      </button>
      <label className="date-picker-button">
        <CalendarDays size={16} />
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        <span>{date}</span>
      </label>
      <button type="button" aria-label={L.nextDay} onClick={() => onDateChange(shiftDate(date, 1))}>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function AdminReviewCard({
  item,
  primary,
  onSetCompleted,
  onPreviewPhoto
}: {
  item: HomeworkItem;
  primary?: boolean;
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
}) {
  return (
    <article className={`admin-review-card ${primary ? 'primary-review' : ''}`}>
      <div className="admin-review-main">
        <span className={`status-badge ${item.status}`}>{statusText(item.status)}</span>
        <strong>{item.content}</strong>
        <small>
          {item.child_name} / {item.date} / {item.photo_count} {L.photoUnit}
        </small>
      </div>
      {item.photos.length > 0 ? (
        <div className="admin-photo-strip">
          {item.photos.slice(0, 6).map((photo, index) => (
            <button type="button" key={photo.id} onClick={() => onPreviewPhoto(item.photos, index, item)}>
              <img src={photo.url} alt={photo.original_filename} />
            </button>
          ))}
        </div>
      ) : (
        <div className="admin-no-photo">
          <ImageIcon size={16} /> {L.noPhoto}
        </div>
      )}
      <div className="row-actions compact-actions">
        {item.is_completed ? (
          <button type="button" onClick={() => onSetCompleted(item, false)}>
            <RotateCcw size={16} /> {L.markIncomplete}
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={() => onSetCompleted(item, true)}>
            <Check size={16} /> {L.markCompleted}
          </button>
        )}
      </div>
    </article>
  );
}
