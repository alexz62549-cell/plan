import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileJson, Image as ImageIcon, ListChecks, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { AdminDateResponse } from '../api';
import { groupPlanTimeline } from '../domain/adminPlan';
import { shiftDate, todayString } from '../domain/dateNav';
import { statusText } from '../domain/homework';
import { normalizeManualPlanRows, type ManualPlanRow } from '../domain/manualPlan';
import type { Child, HomeworkItem, Photo } from '../domain/types';

const L = {
  appTitle: '\u6691\u5047\u4f5c\u4e1a\u7ba1\u7406',
  reviewLink: '\u624b\u673a\u5ba1\u6838',
  byDate: '\u4f5c\u4e1a\u7ba1\u7406',
  pending: '\u5f85\u5ba1\u6838',
  plan: '\u4f5c\u4e1a\u8ba1\u5212',
  jsonImport: 'JSON\u5bfc\u5165',
  previousDay: '\u524d\u4e00\u5929',
  nextDay: '\u540e\u4e00\u5929',
  today: '\u4eca\u5929',
  password: '\u5bb6\u957f\u5bc6\u7801',
  defaultPassword: '\u9ed8\u8ba4 123456',
  localNote: '\u8fd9\u4e2a\u9875\u9762\u7528\u6765\u5f55\u5165\u3001\u5bfc\u5165\u548c\u7ba1\u7406\u4f5c\u4e1a\u8ba1\u5212\u3002',
  noHomework: '\u8fd9\u5929\u6ca1\u6709\u4f5c\u4e1a',
  todaySummary: '\u4eca\u65e5\u6982\u89c8',
  todayCompleted: '\u4eca\u65e5\u5df2\u5b8c\u6210',
  noPending: '\u6682\u65e0\u5f85\u5ba1\u6838\u7167\u7247',
  childNames: '\u5b69\u5b50\u540d\u79f0',
  quickAdd: '\u5feb\u901f\u5f55\u5165',
  planOverview: '\u8ba1\u5212\u603b\u89c8',
  jumpDateNote: '\u53f3\u4e0a\u89d2\u65e5\u671f\u7528\u4e8e\u5b9a\u4f4d\u6708\u4efd\uff0c\u5e76\u4f5c\u4e3a\u65b0\u589e\u884c\u7684\u9ed8\u8ba4\u65e5\u671f\u3002',
  child: '\u5b69\u5b50',
  date: '\u65e5\u671f',
  subject: '\u5b66\u79d1',
  content: '\u4f5c\u4e1a\u5185\u5bb9',
  dictationTitle: '\u542c\u5199\u6807\u9898',
  dictationWords: '\u542c\u5199\u5355\u8bcd',
  dictationSection: '\u542c\u5199\u4f5c\u4e1a',
  dictationHint: '\u6bcf\u884c\u4e00\u4e2a\u5355\u8bcd\u6216\u77ed\u8bed\uff0c\u53ef\u5728\u540e\u9762\u52a0\u4e2d\u6587\u63d0\u793a\uff1alibrary \u56fe\u4e66\u9986',
  createDictation: '\u521b\u5efa\u542c\u5199',
  save: '\u4fdd\u5b58',
  addRow: '\u589e\u52a0\u4e00\u884c',
  batchAdd: '\u6279\u91cf\u6dfb\u52a0',
  clearRows: '\u6e05\u7a7a\u5df2\u586b\u884c',
  fillSample: '\u586b\u5165\u793a\u4f8b',
  validatePreview: '\u6821\u9a8c\u9884\u89c8',
  confirmImport: '\u786e\u8ba4\u5bfc\u5165',
  importHint: '\u5148\u7c98\u8d34 AI \u751f\u6210\u7684 JSON\uff0c\u518d\u6821\u9a8c\u9884\u89c8\u3002',
  markCompleted: '\u6807\u8bb0\u5b8c\u6210',
  markIncomplete: '\u6539\u4e3a\u672a\u5b8c\u6210',
  delete: '\u5220\u9664',
  noPlanItems: '\u5f53\u6708\u8fd8\u6ca1\u6709\u4f5c\u4e1a\u8ba1\u5212',
  collapse: '\u6536\u8d77',
  expand: '\u5c55\u5f00',
  photoUnit: '\u5f20\u7167\u7247'
};

const SUBJECT_OPTIONS = ['\u8bed\u6587', '\u6570\u5b66', '\u5916\u8bed', '\u5176\u4ed6'];

const sampleJson = JSON.stringify(
  {
    children: [
      {
        name: '\u5b89\u5b89',
        days: [
          {
            date: '2026-07-04',
            items: [
              { subject: '\u8bed\u6587', content: '\u9605\u8bfb 20 \u5206\u949f' },
              { subject: '\u6570\u5b66', content: '\u53e3\u7b97 2 \u9875' }
            ]
          }
        ]
      }
    ]
  },
  null,
  2
);

function emptyRows(children: Child[], date: string): ManualPlanRow[] {
  return Array.from({ length: 3 }, () => ({
    child_id: children[0]?.id ?? 0,
    date,
    subject: SUBJECT_OPTIONS[0],
    content: ''
  }));
}

export function AdminManage({
  children,
  password,
  onPasswordChange,
  date,
  onDateChange,
  dateData,
  planItems,
  pending,
  importText,
  onImportTextChange,
  importPreview,
  importMessage,
  onPreviewImport,
  onConfirmImport,
  onCreateHomeworks,
  onCreateDictation,
  onDeleteHomework,
  onSetCompleted,
  onRenameChild,
  onPreviewPhoto
}: {
  children: Child[];
  password: string;
  onPasswordChange: (password: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  dateData: AdminDateResponse | null;
  planItems: HomeworkItem[];
  pending: HomeworkItem[];
  importText: string;
  onImportTextChange: (text: string) => void;
  importPreview: Array<Record<string, unknown>>;
  importMessage: string;
  onPreviewImport: () => void;
  onConfirmImport: () => void;
  onCreateHomeworks: (rows: ManualPlanRow[]) => Promise<void>;
  onCreateDictation: (payload: DictationCreatePayload) => Promise<void>;
  onDeleteHomework: (item: HomeworkItem) => void;
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onRenameChild: (child: Child, name: string) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<'date' | 'pending' | 'plan' | 'import'>('date');
  const [manualRows, setManualRows] = useState<ManualPlanRow[]>(() => emptyRows(children, date));
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});
  const [openChildren, setOpenChildren] = useState<Record<string, boolean>>({});
  const [planMessage, setPlanMessage] = useState('');
  const [dictationChildId, setDictationChildId] = useState(() => children[0]?.id ?? 0);
  const [dictationTitle, setDictationTitle] = useState('\u82f1\u8bed\u542c\u5199');
  const [dictationWords, setDictationWords] = useState('');
  const timeline = useMemo(() => groupPlanTimeline(planItems), [planItems]);
  const completedCount = useMemo(
    () =>
      dateData?.children.reduce(
        (sum, childBlock) =>
          sum + childBlock.subjects.flatMap((group) => group.items).filter((item) => item.is_completed).length,
        0
      ) ?? 0,
    [dateData]
  );

  const updateRow = (index: number, patch: Partial<ManualPlanRow>) => {
    setManualRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  useEffect(() => {
    const firstChildId = children[0]?.id ?? 0;
    if (!firstChildId) return;
    setDictationChildId((value) => value || firstChildId);
    setManualRows((rows) =>
      rows.map((row) => ({
        ...row,
        child_id: row.child_id || firstChildId,
        date: row.date || date,
        subject: SUBJECT_OPTIONS.includes(row.subject) ? row.subject : SUBJECT_OPTIONS[0]
      }))
    );
  }, [children, date]);

  const removeRow = (index: number) => {
    setManualRows((rows) => (rows.length === 1 ? emptyRows(children, date).slice(0, 1) : rows.filter((_, rowIndex) => rowIndex !== index)));
  };

  async function submitManualRows() {
    try {
      const rows = normalizeManualPlanRows(manualRows);
      if (rows.length === 0) {
        setPlanMessage('\u8bf7\u5148\u586b\u5199\u81f3\u5c11\u4e00\u6761\u4f5c\u4e1a\u3002');
        return;
      }
      await onCreateHomeworks(rows);
      setPlanMessage(`\u5df2\u6dfb\u52a0 ${rows.length} \u6761\u4f5c\u4e1a\u3002`);
      setManualRows(emptyRows(children, date));
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : '\u6dfb\u52a0\u5931\u8d25');
    }
  }

  async function submitDictation() {
    try {
      const words = parseDictationWords(dictationWords);
      if (!dictationChildId || !dictationTitle.trim() || words.length === 0) {
        setPlanMessage('\u8bf7\u586b\u5199\u542c\u5199\u6807\u9898\u548c\u5355\u8bcd\u3002');
        return;
      }
      await onCreateDictation({
        child_id: dictationChildId,
        date,
        title: dictationTitle.trim(),
        words
      });
      setPlanMessage(`\u5df2\u521b\u5efa\u542c\u5199\uff0c\u5171 ${words.length} \u4e2a\u5355\u8bcd\u3002`);
      setDictationWords('');
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : '\u521b\u5efa\u542c\u5199\u5931\u8d25');
    }
  }

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="mini-label">Parent Admin</p>
          <h1>{L.appTitle}</h1>
        </div>
        <nav>
          <button className={activeTab === 'date' ? 'active' : ''} onClick={() => setActiveTab('date')} type="button">
            <ListChecks size={17} /> {L.byDate}
          </button>
          <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')} type="button">
            <ImageIcon size={17} /> {L.pending}
          </button>
          <button className={activeTab === 'plan' ? 'active' : ''} onClick={() => setActiveTab('plan')} type="button">
            <Plus size={17} /> {L.plan}
          </button>
          <button className={activeTab === 'import' ? 'active' : ''} onClick={() => setActiveTab('import')} type="button">
            <FileJson size={17} /> {L.jsonImport}
          </button>
          <a className="sidebar-link" href="/admin">
            {L.reviewLink}
          </a>
        </nav>
        <label className="admin-password">
          {L.password}
          <input value={password} type="password" placeholder={L.defaultPassword} onChange={(event) => onPasswordChange(event.target.value)} />
        </label>
      </aside>

      <main className="admin-main">
        <header className="admin-toolbar">
          <div>
            <h2>{activeTab === 'date' ? L.byDate : activeTab === 'pending' ? L.pending : activeTab === 'plan' ? L.plan : L.jsonImport}</h2>
            <p>{L.localNote}</p>
          </div>
          <DateNavigator date={date} onDateChange={onDateChange} />
        </header>

        {activeTab === 'date' ? (
          <div className="admin-grid">
            <div className="review-list">
              {dateData?.children.map((childBlock) => (
                <section className="admin-section" key={childBlock.child.id}>
                  <h3>{childBlock.child.name}</h3>
                  {childBlock.subjects.length === 0 ? <p className="muted">{L.noHomework}</p> : null}
                  {childBlock.subjects.map((group) => (
                    <div className="admin-subject" key={`${childBlock.child.id}-${group.subject}`}>
                      <div className="admin-subject-title">{group.subject}</div>
                      {group.items.map((item) => (
                        <AdminRow key={item.id} item={item} onDeleteHomework={onDeleteHomework} onSetCompleted={onSetCompleted} onPreviewPhoto={onPreviewPhoto} />
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <aside className="side-panel">
              <h3>{L.todaySummary}</h3>
              <div className="metric-row">
                <span>{L.pending}</span>
                <strong>{pending.length}</strong>
              </div>
              <div className="metric-row">
                <span>{L.todayCompleted}</span>
                <strong>{completedCount}</strong>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === 'pending' ? (
          <section className="admin-section">
            {pending.length === 0 ? <p className="muted">{L.noPending}</p> : null}
            {pending.map((item) => (
              <AdminRow key={item.id} item={item} onDeleteHomework={onDeleteHomework} onSetCompleted={onSetCompleted} onPreviewPhoto={onPreviewPhoto} />
            ))}
          </section>
        ) : null}

        {activeTab === 'plan' ? (
          <div className="plan-workspace">
            <section className="admin-section">
              <div className="child-settings">
                <h3>{L.childNames}</h3>
                {children.map((child) => (
                  <ChildNameEditor key={child.id} child={child} onRenameChild={onRenameChild} />
                ))}
              </div>
              <div className="section-heading plan-heading">
                <h3>{L.quickAdd}</h3>
                <span>{L.jumpDateNote}</span>
              </div>
              <div className="manual-plan-table">
                <div className="manual-plan-head">
                  <span>{L.child}</span>
                  <span>{L.date}</span>
                  <span>{L.subject}</span>
                  <span>{L.content}</span>
                  <span>{L.delete}</span>
                </div>
                {manualRows.map((row, index) => (
                  <div className="manual-plan-row" key={index}>
                    <select value={row.child_id} onChange={(event) => updateRow(index, { child_id: Number(event.target.value) })}>
                      {children.map((child) => (
                        <option value={child.id} key={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </select>
                    <input type="date" value={row.date} onChange={(event) => updateRow(index, { date: event.target.value })} />
                    <select aria-label={`${L.subject}${index + 1}`} value={row.subject} onChange={(event) => updateRow(index, { subject: event.target.value })}>
                      {SUBJECT_OPTIONS.map((subject) => (
                        <option value={subject} key={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                    <input value={row.content} placeholder={L.content} onChange={(event) => updateRow(index, { content: event.target.value })} />
                    <button className="icon-danger-button" type="button" onClick={() => removeRow(index)} aria-label={`${L.delete}${index + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="plan-actions">
                <button type="button" onClick={() => setManualRows((rows) => [...rows, { ...(emptyRows(children, date)[0] ?? { child_id: children[0]?.id ?? 0, date, subject: SUBJECT_OPTIONS[0], content: '' }), date }])}>
                  <Plus size={16} /> {L.addRow}
                </button>
                <button type="button" onClick={() => setManualRows(emptyRows(children, date))}>
                  {L.clearRows}
                </button>
                <button className="primary-action" type="button" onClick={submitManualRows}>
                  <Plus size={16} /> {L.batchAdd}
                </button>
              </div>
              {planMessage ? <p className="form-message">{planMessage}</p> : null}
            </section>

            <section className="admin-section">
              <div className="section-heading plan-heading">
                <h3>{L.dictationSection}</h3>
                <span>{L.dictationHint}</span>
              </div>
              <div className="dictation-form">
                <label>
                  {L.child}
                  <select value={dictationChildId} onChange={(event) => setDictationChildId(Number(event.target.value))}>
                    {children.map((child) => (
                      <option value={child.id} key={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {L.dictationTitle}
                  <input value={dictationTitle} onChange={(event) => setDictationTitle(event.target.value)} />
                </label>
                <label className="dictation-words-field">
                  {L.dictationWords}
                  <textarea value={dictationWords} onChange={(event) => setDictationWords(event.target.value)} placeholder={'library \u56fe\u4e66\u9986\nmusic room \u97f3\u4e50\u6559\u5ba4'} />
                </label>
              </div>
              <div className="plan-actions">
                <button className="primary-action" type="button" onClick={submitDictation}>
                  <Plus size={16} /> {L.createDictation}
                </button>
              </div>
            </section>

            <section className="admin-section">
              <div className="section-heading">
                <h3>{L.planOverview}</h3>
                <span>{date.slice(0, 7)}</span>
              </div>
              {timeline.length === 0 ? <p className="muted">{L.noPlanItems}</p> : null}
              <div className="plan-timeline">
                {timeline.map((dateGroup) => {
                  const dateOpen = openDates[dateGroup.date] ?? dateGroup.date === date;
                  return (
                    <div className="timeline-day" key={dateGroup.date}>
                      <button className="timeline-day-toggle" type="button" onClick={() => setOpenDates((value) => ({ ...value, [dateGroup.date]: !dateOpen }))}>
                        <span>
                          {dateOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <strong>{dateGroup.date}</strong>
                        </span>
                        <em>
                          {dateGroup.completed}/{dateGroup.total}
                          {dateGroup.pending > 0 ? ` · ${L.pending} ${dateGroup.pending}` : ''}
                        </em>
                      </button>
                      {dateOpen ? (
                        <div className="timeline-day-body">
                          {dateGroup.children.map((childGroup) => {
                            const childKey = `${dateGroup.date}-${childGroup.childId}`;
                            const childOpen = openChildren[childKey] ?? true;
                            return (
                              <div className="timeline-child" key={childKey}>
                                <button className="timeline-child-toggle" type="button" onClick={() => setOpenChildren((value) => ({ ...value, [childKey]: !childOpen }))}>
                                  <span>
                                    {childOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    {childGroup.childName}
                                  </span>
                                  <em>{childGroup.total}</em>
                                </button>
                                {childOpen ? (
                                  <div className="timeline-child-body">
                                    {childGroup.subjects.map((subjectGroup) => (
                                      <div className="timeline-subject" key={`${childKey}-${subjectGroup.subject}`}>
                                        <h4>{subjectGroup.subject}</h4>
                                        {subjectGroup.items.map((item) => (
                                          <AdminRow key={item.id} item={item} onDeleteHomework={onDeleteHomework} onSetCompleted={onSetCompleted} onPreviewPhoto={onPreviewPhoto} showCompletionAction={false} />
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'import' ? (
          <section className="import-layout">
            <textarea value={importText} onChange={(event) => onImportTextChange(event.target.value)} placeholder={sampleJson} />
            <div className="import-panel">
              <div className="import-actions">
                <button type="button" onClick={() => onImportTextChange(sampleJson)}>
                  {L.fillSample}
                </button>
                <button type="button" onClick={onPreviewImport}>
                  {L.validatePreview}
                </button>
                <button className="primary-action" type="button" onClick={onConfirmImport}>
                  {L.confirmImport}
                </button>
              </div>
              <p className="muted">{importMessage || L.importHint}</p>
              <div className="preview-table">
                {importPreview.slice(0, 20).map((row, index) => (
                  <div key={index}>
                    <span>{String(row.child_name)}</span>
                    <span>{String(row.date)}</span>
                    <span>{String(row.subject)}</span>
                    <span>{String(row.content)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </section>
  );
}

type DictationCreatePayload = {
  child_id: number;
  date: string;
  title: string;
  words: Array<{ word: string; hint?: string }>;
};

function parseDictationWords(text: string): Array<{ word: string; hint?: string }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const last = parts[parts.length - 1];
      if (parts.length > 1 && /[\u4e00-\u9fff]/.test(last)) {
        return { word: parts.slice(0, -1).join(' '), hint: last };
      }
      return { word: line };
    })
    .filter((item) => item.word);
}

function DateNavigator({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  return (
    <div className="date-navigator">
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

function ChildNameEditor({ child, onRenameChild }: { child: Child; onRenameChild: (child: Child, name: string) => void }) {
  const [name, setName] = useState(child.name);

  return (
    <div className="child-name-row">
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" onClick={() => onRenameChild(child, name.trim())} disabled={!name.trim() || name === child.name}>
        {L.save}
      </button>
    </div>
  );
}

function AdminRow({
  item,
  onDeleteHomework,
  onSetCompleted,
  onPreviewPhoto,
  showCompletionAction = true
}: {
  item: HomeworkItem;
  onDeleteHomework: (item: HomeworkItem) => void;
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
  showCompletionAction?: boolean;
}) {
  return (
    <article className="admin-row">
      <div className="row-main">
        <span className={`status-badge ${item.status}`}>{statusText(item.status)}</span>
        <strong>{item.content}</strong>
        <small>
          {item.child_name} / {item.date} / {item.photo_count} {L.photoUnit}
        </small>
      </div>
      <div className="admin-thumbs">
        {item.photos.slice(0, 4).map((photo, index) => (
          <button type="button" key={photo.id} onClick={() => onPreviewPhoto(item.photos, index, item)}>
            <img src={photo.url} alt={photo.original_filename} />
          </button>
        ))}
      </div>
      <div className="row-actions">
        {showCompletionAction ? (
          item.is_completed ? (
            <button type="button" onClick={() => onSetCompleted(item, false)}>
              <RotateCcw size={16} /> {L.markIncomplete}
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={() => onSetCompleted(item, true)}>
              <Check size={16} /> {L.markCompleted}
            </button>
          )
        ) : null}
        <button type="button" onClick={() => onDeleteHomework(item)}>
          <Trash2 size={16} /> {L.delete}
        </button>
      </div>
    </article>
  );
}
