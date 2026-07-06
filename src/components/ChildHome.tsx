import { Camera, CalendarDays, ChevronDown, ChevronUp, Eye, Image as ImageIcon, Lock, Pause, Play, RotateCcw, Send, SkipBack, SkipForward, Trash2, Volume2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { splitVisibleAndCompleted, statusText, summarizeHomework } from '../domain/homework';
import type { Child, DictationAssignment, DictationWord, HomeworkDay, HomeworkItem, Photo } from '../domain/types';

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
  ,
  startDictation: '\u5f00\u59cb\u542c\u5199',
  pauseDictation: '\u6682\u505c',
  resumeDictation: '\u7ee7\u7eed',
  replayCurrent: '\u91cd\u64ad\u5f53\u524d',
  previousWord: '\u4e0a\u4e00\u4e2a',
  nextWord: '\u4e0b\u4e00\u4e2a',
  restartDictation: '\u91cd\u65b0\u542c\u5199',
  showAnswers: '\u663e\u793a\u7b54\u6848',
  dictationProgress: '\u542c\u5199\u8fdb\u5ea6',
  dictationNoWords: '\u8fd9\u7ec4\u542c\u5199\u8fd8\u6ca1\u6709\u5355\u8bcd'
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
  onLoadDictationAnswers: (item: HomeworkItem) => Promise<DictationAssignment>;
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
  onPreview,
  onLoadDictationAnswers
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
                  onLoadDictationAnswers={onLoadDictationAnswers}
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
                  onLoadDictationAnswers={onLoadDictationAnswers}
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
  onPreview,
  onLoadDictationAnswers
}: {
  item: HomeworkItem;
  pendingPhotos: PendingPhoto[];
  submitting: boolean;
  onPickPhotos: (item: HomeworkItem, files: FileList) => void;
  onRemovePending: (item: HomeworkItem, index: number) => void;
  onSubmit: (item: HomeworkItem) => void;
  onDeletePhoto: (photo: Photo) => void;
  onPreview: (photos: Photo[], index: number, item?: HomeworkItem) => void;
  onLoadDictationAnswers: (item: HomeworkItem) => Promise<DictationAssignment>;
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

      {item.dictation ? <DictationPanel item={item} onLoadAnswers={onLoadDictationAnswers} /> : null}

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

function DictationPanel({ item, onLoadAnswers }: { item: HomeworkItem; onLoadAnswers: (item: HomeworkItem) => Promise<DictationAssignment> }) {
  const dictation = item.dictation;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [answers, setAnswers] = useState<DictationAssignment | null>(null);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const playRunRef = useRef(0);

  if (!dictation) return null;
  const words = dictation.words;
  const currentWord = words[currentIndex];

  const stopPlayback = () => {
    playRunRef.current += 1;
    setPlaying(false);
  };

  const playWord = async (word: DictationWord, runId: number) => {
    for (let repeat = 0; repeat < dictation.config.repeat_each_word; repeat += 1) {
      if (playRunRef.current !== runId) return;
      await playAudioOrSpeech(word);
      if (repeat < dictation.config.repeat_each_word - 1) {
        await wait(dictation.config.pause_between_repeats_ms);
      }
    }
  };

  const startAuto = async (fromIndex = currentIndex) => {
    const runId = playRunRef.current + 1;
    playRunRef.current = runId;
    setPlaying(true);
    for (let index = fromIndex; index < words.length; index += 1) {
      if (playRunRef.current !== runId) return;
      setCurrentIndex(index);
      await playWord(words[index], runId);
      if (index < words.length - 1) await wait(dictation.config.pause_between_words_ms);
    }
    if (playRunRef.current === runId) setPlaying(false);
  };

  const replay = async () => {
    if (!currentWord) return;
    const runId = playRunRef.current + 1;
    playRunRef.current = runId;
    setPlaying(true);
    await playWord(currentWord, runId);
    if (playRunRef.current === runId) setPlaying(false);
  };

  const revealAnswers = async () => {
    if (answers) return;
    setLoadingAnswers(true);
    try {
      setAnswers(await onLoadAnswers(item));
    } finally {
      setLoadingAnswers(false);
    }
  };

  return (
    <div className="dictation-player">
      <div className="dictation-player-head">
        <span>
          <Volume2 size={15} /> {C.dictationProgress} {words.length ? currentIndex + 1 : 0}/{words.length}
        </span>
        <button type="button" onClick={revealAnswers} disabled={loadingAnswers}>
          <Eye size={15} /> {C.showAnswers}
        </button>
      </div>
      {words.length === 0 ? <p className="muted">{C.dictationNoWords}</p> : null}
      {words.length > 0 ? (
        <div className="dictation-controls">
          <button type="button" onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>
            <SkipBack size={15} /> {C.previousWord}
          </button>
          {playing ? (
            <button type="button" onClick={stopPlayback}>
              <Pause size={15} /> {C.pauseDictation}
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={() => startAuto(currentIndex)}>
              <Play size={15} /> {C.startDictation}
            </button>
          )}
          <button type="button" onClick={replay}>
            <Volume2 size={15} /> {C.replayCurrent}
          </button>
          <button type="button" onClick={() => setCurrentIndex((value) => Math.min(words.length - 1, value + 1))}>
            <SkipForward size={15} /> {C.nextWord}
          </button>
          <button type="button" onClick={() => startAuto(0)}>
            <RotateCcw size={15} /> {C.restartDictation}
          </button>
        </div>
      ) : null}
      {answers ? (
        <ol className="dictation-answers">
          {answers.words.map((word) => (
            <li key={word.index}>
              <strong>{word.word}</strong>
              {word.hint ? <span>{word.hint}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function playAudioOrSpeech(word: DictationWord) {
  if (word.audio_url) {
    return new Promise<void>((resolve) => {
      const audio = new Audio(word.audio_url ?? '');
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  }
  return Promise.resolve();
}
