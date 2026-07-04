import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';

import type { HomeworkItem, Photo } from '../domain/types';

export function PhotoViewer({
  photos,
  startIndex,
  item,
  canComplete,
  onClose,
  onComplete
}: {
  photos: Photo[];
  startIndex: number;
  item?: HomeworkItem;
  canComplete?: boolean;
  onClose: () => void;
  onComplete?: (item: HomeworkItem) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="viewer-backdrop" role="dialog" aria-modal="true">
      <div className="viewer">
        <div className="viewer-bar">
          <span>
            {index + 1} / {photos.length}
          </span>
          <button type="button" onClick={onClose} aria-label="关闭预览">
            <X size={20} />
          </button>
        </div>
        <img src={photo.url} alt={photo.original_filename} />
        <div className="viewer-actions">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
            <ChevronLeft size={18} /> 上一张
          </button>
          {canComplete && item && !item.is_completed ? (
            <button className="primary-action" type="button" onClick={() => onComplete?.(item)}>
              <Check size={18} /> 标记完成
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIndex((value) => Math.min(photos.length - 1, value + 1))}
            disabled={index === photos.length - 1}
          >
            下一张 <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
