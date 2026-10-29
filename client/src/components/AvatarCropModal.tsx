import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLang } from '../i18n';
import { cropToSquareDataUrl, loadImage } from '../utils';

interface Props {
  /** The chosen file as a raw data URL (not yet cropped or uploaded). */
  source: string;
  /** True while the parent is uploading the confirmed crop. */
  busy: boolean;
  onCancel: () => void;
  onConfirm: (cropped: string) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Circular avatar cropper: drag to reposition, pinch/scroll/slider to zoom.
 * Emits a square 512px image of what the circle shows; uploading is the
 * caller's job.
 */
export default function AvatarCropModal({ source, busy, onCancel, onConfirm }: Props) {
  const { t } = useLang();
  const stageRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null);
  // Parent passes an inline callback; keep it in a ref so re-renders of the
  // parent (e.g. the busy spinner) never restart the image load.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    let alive = true;
    setImg(null);
    loadImage(source)
      .then((im) => {
        if (alive) setImg(im);
      })
      .catch(() => {
        if (alive) onCancelRef.current();
      });
    return () => {
      alive = false;
    };
  }, [source]);

  // Measure the circular stage so offsets/crops stay in sync with its size.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setSize(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy]);

  // Wheel zoom; non-passive so the page does not scroll behind the modal.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * Math.exp(-e.deltaY * 0.0015))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Scale 1 = the image just covers the circle (the smaller side fits exactly).
  const cover = img && size > 0 ? size / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const k = cover * scale;

  /** Clamp so the circle is always fully covered — no empty gaps. */
  function clamp(o: { x: number; y: number }, factor: number): { x: number; y: number } {
    if (!img || size <= 0) return { x: 0, y: 0 };
    const rx = Math.max(0, (img.naturalWidth * factor) / 2 - size / 2);
    const ry = Math.max(0, (img.naturalHeight * factor) / 2 - size / 2);
    return {
      x: Math.min(rx, Math.max(-rx, o.x)),
      y: Math.min(ry, Math.max(-ry, o.y)),
    };
  }

  const pos = clamp(offset, k);

  function setClampedScale(next: number) {
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el || busy) return;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      // Normalize stored offset to the clamped one so drags never jump.
      setOffset(pos);
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      setOffset((o) => ({ x: o.x + (e.clientX - prev.x), y: o.y + (e.clientY - prev.y) }));
      return;
    }
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const g = pinch.current;
      if (g && g.dist > 0) {
        setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (dist / g.dist))));
        setOffset((o) => ({ x: o.x + (mx - g.x), y: o.y + (my - g.y) }));
      }
      pinch.current = { dist, x: mx, y: my };
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function confirm() {
    if (!img || busy) return;
    const out = cropToSquareDataUrl(img, k, pos.x, pos.y, size);
    // Fall back to the raw file if the canvas failed; the server crops too.
    onConfirm(out || source);
  }

  let imgStyle: CSSProperties | undefined;
  if (img && size > 0) {
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    imgStyle = {
      left: (size - w) / 2 + pos.x,
      top: (size - h) / 2 + pos.y,
      width: w,
      height: h,
    };
  }

  return (
    <div
      className="overlay avatar-crop-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal avatar-crop-modal" role="dialog" aria-modal="true" aria-label={t('member.cropTitle')}>
        <h3>{t('member.cropTitle')}</h3>
        <p className="desc">{t('member.cropHint')}</p>

        <div
          className="avatar-crop-stage"
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && imgStyle && <img src={source} alt="" style={imgStyle} draggable={false} />}
        </div>

        <label className="avatar-crop-zoom">
          <span>{t('member.cropZoom')}</span>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setClampedScale(Number(e.target.value))}
            disabled={!img || busy}
          />
        </label>

        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={!img || busy}>
            {busy && <span className="spinner" />}
            {t('member.cropUse')}
          </button>
        </div>
      </div>
    </div>
  );
}
