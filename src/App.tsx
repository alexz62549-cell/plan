import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, type AdminDateResponse } from './api';
import { AdminHome } from './components/AdminHome';
import { ChildHome } from './components/ChildHome';
import { PhotoViewer } from './components/PhotoViewer';
import { todayString } from './domain/dateNav';
import { getAppModeFromPath } from './domain/navigation';
import type { ManualPlanRow } from './domain/manualPlan';
import type { Child, HomeworkDay, HomeworkItem, Photo } from './domain/types';
import { compressImage } from './image';

type ViewerState = {
  photos: Photo[];
  index: number;
  item?: HomeworkItem;
  admin?: boolean;
} | null;

const M = {
  loadFailed: '\u52a0\u8f7d\u5931\u8d25',
  adminLoadFailed: '\u5bb6\u957f\u7aef\u52a0\u8f7d\u5931\u8d25',
  uploading: '\u6b63\u5728\u4e0a\u4f20\u7167\u7247...',
  uploaded: '\u7167\u7247\u5df2\u4e0a\u4f20\uff0c\u7b49\u5f85\u5bb6\u957f\u786e\u8ba4\u3002',
  uploadFailed: '\u4e0a\u4f20\u5931\u8d25',
  deletePhotoConfirm: '\u5220\u9664\u8fd9\u5f20\u7167\u7247\uff1f',
  importPassed: '\u6821\u9a8c\u901a\u8fc7',
  importBadJson: 'JSON \u683c\u5f0f\u4e0d\u6b63\u786e',
  imported: '\u5df2\u5bfc\u5165',
  importFailed: '\u5bfc\u5165\u5931\u8d25',
  deleteHomeworkConfirm: '\u8fd9\u9879\u4f5c\u4e1a\u5df2\u6709\u7167\u7247\uff0c\u4ecd\u8981\u5220\u9664\uff1f',
  rowsAdded: '\u5df2\u6dfb\u52a0'
};

export default function App() {
  const mode = getAppModeFromPath(window.location.pathname);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState(() => Number(localStorage.getItem('lastChildId') || '0'));
  const [date, setDate] = useState(todayString());
  const [day, setDay] = useState<HomeworkDay | null>(null);
  const [adminDate, setAdminDate] = useState<AdminDateResponse | null>(null);
  const [pending, setPending] = useState<HomeworkItem[]>([]);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('adminPassword') || '123456');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<Array<Record<string, unknown>>>([]);
  const [importMessage, setImportMessage] = useState('');
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedChildId = useMemo(() => childId || children[0]?.id || 0, [childId, children]);

  const loadChildren = useCallback(async () => {
    const loaded = await api.children();
    setChildren(loaded);
    if (!childId && loaded[0]) setChildId(loaded[0].id);
  }, [childId]);

  const loadChildDay = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    try {
      setDay(await api.homework(selectedChildId, date));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : M.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [date, selectedChildId]);

  const loadAdmin = useCallback(async () => {
    if (!adminPassword) return;
    try {
      const [dateResult, pendingResult] = await Promise.all([api.adminDate(date, adminPassword), api.pending(adminPassword)]);
      setAdminDate(dateResult);
      setPending(pendingResult);
      localStorage.setItem('adminPassword', adminPassword);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : M.adminLoadFailed);
    }
  }, [adminPassword, date]);

  useEffect(() => {
    loadChildren().catch((error) => setMessage(error.message));
  }, [loadChildren]);

  useEffect(() => {
    localStorage.setItem('lastChildId', String(selectedChildId));
    loadChildDay().catch((error) => setMessage(error.message));
  }, [loadChildDay, selectedChildId]);

  useEffect(() => {
    if (mode === 'admin') loadAdmin().catch((error) => setMessage(error.message));
  }, [loadAdmin, mode]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadChildDay(), mode === 'admin' ? loadAdmin() : Promise.resolve()]);
  }, [loadAdmin, loadChildDay, mode]);

  async function handleUpload(item: HomeworkItem, files: File[]) {
    setMessage(M.uploading);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        await api.uploadPhoto(item.id, compressed);
      }
      setMessage(M.uploaded);
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : M.uploadFailed);
      throw error;
    }
  }

  async function handleDeletePhoto(photo: Photo) {
    if (!confirm(M.deletePhotoConfirm)) return;
    await api.deletePhoto(photo.id);
    await refreshAll();
  }

  async function setCompleted(item: HomeworkItem, completed: boolean) {
    await api.setCompleted(item.id, completed, adminPassword);
    await refreshAll();
    setViewer(null);
  }

  async function previewImport() {
    try {
      const parsed = JSON.parse(importText);
      const result = await api.importPreview(parsed);
      setImportPreview(result.rows);
      setImportMessage(`${M.importPassed}\uff0c\u5171 ${result.item_count} \u9879\u3002`);
    } catch (error) {
      setImportPreview([]);
      setImportMessage(error instanceof Error ? error.message : M.importBadJson);
    }
  }

  async function confirmImport() {
    try {
      const parsed = JSON.parse(importText);
      const result = await api.importPlan(parsed, adminPassword);
      setImportMessage(`${M.imported} ${result.created} \u9879\u3002`);
      await refreshAll();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : M.importFailed);
    }
  }

  return (
    <div className="app">
      {message ? (
        <button className="toast" type="button" onClick={() => setMessage('')}>
          {message}
        </button>
      ) : null}

      {mode === 'child' ? (
        <ChildHome
          children={children}
          currentChildId={selectedChildId}
          date={date}
          day={day}
          loading={loading}
          onChildChange={(id) => {
            setChildId(id);
            localStorage.setItem('lastChildId', String(id));
          }}
          onDateChange={setDate}
          onUpload={handleUpload}
          onDeletePhoto={handleDeletePhoto}
          onPreview={(photos, index, item) => setViewer({ photos, index, item })}
        />
      ) : (
        <AdminHome
          children={children}
          password={adminPassword}
          onPasswordChange={setAdminPassword}
          date={date}
          onDateChange={setDate}
          dateData={adminDate}
          pending={pending}
          importText={importText}
          onImportTextChange={setImportText}
          importPreview={importPreview}
          importMessage={importMessage}
          onPreviewImport={previewImport}
          onConfirmImport={confirmImport}
          onCreateHomeworks={async (rows: ManualPlanRow[]) => {
            for (const row of rows) {
              await api.createHomework(row, adminPassword);
            }
            setMessage(`${M.rowsAdded} ${rows.length} \u6761\u4f5c\u4e1a\u3002`);
            await refreshAll();
          }}
          onDeleteHomework={async (item) => {
            if (item.photo_count > 0 && !confirm(M.deleteHomeworkConfirm)) return;
            await api.deleteHomework(item.id, adminPassword);
            await refreshAll();
          }}
          onSetCompleted={setCompleted}
          onRenameChild={async (child, name) => {
            if (!name || name === child.name) return;
            await api.updateChild(child.id, name, adminPassword);
            await loadChildren();
            await refreshAll();
          }}
          onPreviewPhoto={(photos, index, item) => setViewer({ photos, index, item, admin: true })}
        />
      )}

      {viewer ? (
        <PhotoViewer
          photos={viewer.photos}
          startIndex={viewer.index}
          item={viewer.item}
          canComplete={viewer.admin}
          onClose={() => setViewer(null)}
          onComplete={(item) => setCompleted(item, true)}
        />
      ) : null}
    </div>
  );
}
