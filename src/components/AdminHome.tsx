import { CalendarDays, Check, ChevronLeft, ChevronRight, FileJson, Image as ImageIcon, ListChecks, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AdminDateResponse } from '../api';
import { shiftDate, todayString } from '../domain/dateNav';
import { normalizeManualPlanRows, type ManualPlanRow } from '../domain/manualPlan';
import type { Child, HomeworkItem, Photo } from '../domain/types';
import { statusText } from '../domain/homework';

const L = {
  appTitle: '\u6691\u5047\u4f5c\u4e1a\u7ba1\u7406',
  byDate: '\u4f5c\u4e1a\u7ba1\u7406',
  pending: '\u5f85\u5ba1\u6838',
  plan: '\u4f5c\u4e1a\u8ba1\u5212',
  jsonImport: 'JSON\u5bfc\u5165',
  previousDay: '\u524d\u4e00\u5929',
  nextDay: '\u540e\u4e00\u5929',
  today: '\u4eca\u5929',
  password: '\u5bb6\u957f\u5bc6\u7801',
  defaultPassword: '\u9ed8\u8ba4 123456',
  localNote: '\u6309\u65e5\u671f\u7ba1\u7406\u5df2\u5b89\u6392\u7684\u4f5c\u4e1a\uff0c\u4e5f\u53ef\u4ee5\u5728\u8fd9\u91cc\u5220\u9664\u6216\u6807\u8bb0\u5b8c\u6210\u3002',
  noHomework: '\u8fd9\u5929\u6ca1\u6709\u4f5c\u4e1a',
  todaySummary: '\u4eca\u65e5\u6982\u89c8',
  todayCompleted: '\u4eca\u65e5\u5df2\u5b8c\u6210',
  noPending: '\u6682\u65e0\u5f85\u5ba1\u6838\u7167\u7247',
  childNames: '\u5b69\u5b50\u540d\u79f0',
  child: '\u5b69\u5b50',
  date: '\u65e5\u671f',
  subject: '\u5b66\u79d1',
  content: '\u4f5c\u4e1a\u5185\u5bb9',
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
  photoUnit: '\u5f20\u7167\u7247'
};

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
    subject: '\u8bed\u6587',
    content: ''
  }));
}

export function AdminHome({
  children,
  password,
  onPasswordChange,
  date,
  onDateChange,
  dateData,
  pending,
  importText,
  onImportTextChange,
  importPreview,
  importMessage,
  onPreviewImport,
  onConfirmImport,
  onCreateHomeworks,
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
  pending: HomeworkItem[];
  importText: string;
  onImportTextChange: (text: string) => void;
  importPreview: Array<Record<string, unknown>>;
  importMessage: string;
  onPreviewImport: () => void;
  onConfirmImport: () => void;
  onCreateHomeworks: (rows: ManualPlanRow[]) => Promise<void>;
  onDeleteHomework: (item: HomeworkItem) => void;
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onRenameChild: (child: Child, name: string) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<'date' | 'pending' | 'plan' | 'import'>('date');
  const [manualRows, setManualRows] = useState<ManualPlanRow[]>(() => emptyRows(children, date));
  const [planMessage, setPlanMessage] = useState('');
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
          <section className="admin-section">
            <div className="child-settings">
              <h3>{L.childNames}</h3>
              {children.map((child) => (
                <ChildNameEditor key={child.id} child={child} onRenameChild={onRenameChild} />
              ))}
            </div>

            <div className="manual-plan-table">
              <div className="manual-plan-head">
                <span>{L.child}</span>
                <span>{L.date}</span>
                <span>{L.subject}</span>
                <span>{L.content}</span>
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
                  <input value={row.subject} placeholder={L.subject} onChange={(event) => updateRow(index, { subject: event.target.value })} />
                  <input value={row.content} placeholder={L.content} onChange={(event) => updateRow(index, { content: event.target.value })} />
                </div>
              ))}
            </div>
            <div className="plan-actions">
              <button type="button" onClick={() => setManualRows((rows) => [...rows, ...emptyRows(children, date).slice(0, 1)])}>
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
  onPreviewPhoto
}: {
  item: HomeworkItem;
  onDeleteHomework: (item: HomeworkItem) => void;
  onSetCompleted: (item: HomeworkItem, completed: boolean) => void;
  onPreviewPhoto: (photos: Photo[], index: number, item?: HomeworkItem) => void;
}) {
  return (
    <article className="admin-row">
      <div className="row-main">
        <span className={`status-badge ${item.status}`}>{statusText(item.status)}</span>
        <strong>{item.content}</strong>
        <small>
          {item.child_name} · {item.date} · {item.photo_count} {L.photoUnit}
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
        {item.is_completed ? (
          <button type="button" onClick={() => onSetCompleted(item, false)}>
            <RotateCcw size={16} /> {L.markIncomplete}
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={() => onSetCompleted(item, true)}>
            <Check size={16} /> {L.markCompleted}
          </button>
        )}
        <button type="button" onClick={() => onDeleteHomework(item)}>
          <Trash2 size={16} /> {L.delete}
        </button>
      </div>
    </article>
  );
}
