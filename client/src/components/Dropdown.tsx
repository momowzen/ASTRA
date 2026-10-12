import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { optionColor } from '../utils';
import { useLang } from '../i18n';

export interface SelectOption {
  value: string;
  label?: string;
  color?: string;
}

type Variant = 'field' | 'cell' | 'coll' | 'lang';

interface MenuRect {
  anchorTop: number;
  anchorBottom: number;
  left: number;
  right: number;
  width: number;
  side: 'left' | 'right';
}

function useMenuPosition() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<MenuRect | null>(null);
  const [placeUp, setPlaceUp] = useState(false);

  useEffect(() => {
    if (!rect) return;
    const close = () => setRect(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setRect(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRect(null);
    };
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [rect]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!rect || !el) return;
    const h = el.offsetHeight;
    const spaceBelow = window.innerHeight - rect.anchorBottom;
    const spaceAbove = rect.anchorTop;
    const shouldUp = h + 8 > spaceBelow && spaceAbove > spaceBelow;
    if (shouldUp !== placeUp) setPlaceUp(shouldUp);
  }, [rect, placeUp]);

  return { triggerRef, menuRef, rect, setRect, placeUp, setPlaceUp };
}

function menuStyle(rect: MenuRect, placeUp: boolean, minWidth: number): CSSProperties {
  const avail = placeUp ? rect.anchorTop : window.innerHeight - rect.anchorBottom;
  return {
    ...(placeUp ? { bottom: window.innerHeight - rect.anchorTop + 4 } : { top: rect.anchorBottom + 4 }),
    ...(rect.side === 'right' ? { right: rect.right } : { left: rect.left }),
    minWidth,
    maxHeight: Math.max(140, Math.min(360, avail - 8)),
  };
}

function chevron() {
  return (
    <span className="dd-chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  variant?: Variant;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function Select({
  value,
  onChange,
  options,
  variant = 'field',
  className = '',
  placeholder = '—',
  disabled,
  title,
  ariaLabel,
  align = 'left',
  clearable = true,
  searchable = false,
  searchPlaceholder = 'Search…',
}: SelectProps) {
  const { triggerRef, menuRef, rect, setRect, placeUp, setPlaceUp } = useMenuPosition();
  const { t } = useLang();
  const current = options.find((o) => o.value === value);
  const shown = current?.label ?? value;
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rect && searchable) searchRef.current?.focus();
  }, [rect, searchable]);

  function openMenu() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minW = r.width;
    let side = align;
    if (side === 'left' && r.left + minW > window.innerWidth - 8) side = 'right';
    else if (side === 'right' && window.innerWidth - r.right + minW > window.innerWidth - 8) side = 'left';
    setQuery('');
    setPlaceUp(false);
    setRect({ anchorTop: r.top, anchorBottom: r.bottom, left: r.left, right: window.innerWidth - r.right, width: r.width, side });
  }

  function pick(v: string) {
    onChange(v);
    setRect(null);
  }

  const filtered = query
    ? options.filter((o) => (o.label ?? o.value).toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`dd-trigger dd-${variant} ${rect ? 'open' : ''} ${className}`}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={!!rect}
        onClick={() => (rect ? setRect(null) : openMenu())}
      >
        <span className="dd-label" style={{ color: current?.color ?? optionColor(value) }}>
          {shown || placeholder}
        </span>
        {chevron()}
      </button>
      {rect &&
        createPortal(
          <div
            ref={menuRef}
            className="dd-menu"
            role="listbox"
            style={menuStyle(rect, placeUp, rect.width)}
          >
            {searchable && (
              <div className="dd-search">
                <input
                  ref={searchRef}
                  value={query}
                  placeholder={searchPlaceholder}
                  onChange={(e) => setQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={searchPlaceholder}
                />
              </div>
            )}
            {clearable && !query && (
              <div className={`dd-item ${value === '' ? 'active' : ''}`} role="option" aria-selected={value === ''} onClick={() => pick('')}>
                <span className="dd-item-label muted">{placeholder}</span>
              </div>
            )}
            {filtered.map((o) => (
              <div
                key={o.value}
                className={`dd-item ${o.value === value ? 'active' : ''}`}
                role="option"
                aria-selected={o.value === value}
                onClick={() => pick(o.value)}
              >
                <span className="dd-item-label" style={{ color: o.color ?? optionColor(o.value) }}>
                  {o.label ?? o.value}
                </span>
              </div>
            ))}
            {filtered.length === 0 && <div className="dd-empty">{t('common.noMatches')}</div>}
          </div>,
          document.body,
        )}
    </>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  variant?: Variant;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

export function DatePicker({
  value,
  onChange,
  variant = 'field',
  className = '',
  placeholder,
  disabled,
  ariaLabel,
  align = 'left',
}: DatePickerProps) {
  const { triggerRef, menuRef, rect, setRect, placeUp, setPlaceUp } = useMenuPosition();
  const { t } = useLang();
  const ph = placeholder ?? t('common.selectDate');
  const selected = parseIso(value);
  const today = new Date();
  const [view, setView] = useState(() => {
    const s = selected ?? { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
    return { y: s.y, m: s.m };
  });

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: { iso: string; day: number; out: boolean }[] = [];
    for (let i = 0; i < start; i++) {
      const d = new Date(view.y, view.m, i - start + 1);
      out.push({ iso: toIso(d), day: d.getDate(), out: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ iso: toIso(new Date(view.y, view.m, d)), day: d, out: false });
    }
    while (out.length % 7 !== 0) {
      const d = new Date(view.y, view.m, daysInMonth + (out.length % 7));
      out.push({ iso: toIso(d), day: d.getDate(), out: true });
    }
    return out;
  }, [view]);

  function openMenu() {
    const el = triggerRef.current;
    if (!el) return;
    const s = parseIso(value);
    if (s) setView({ y: s.y, m: s.m });
    const r = el.getBoundingClientRect();
    const w = 252;
    let side = align;
    if (side === 'left' && r.left + w > window.innerWidth - 8) side = 'right';
    else if (side === 'right' && window.innerWidth - r.right + w > window.innerWidth - 8) side = 'left';
    setPlaceUp(false);
    setRect({ anchorTop: r.top, anchorBottom: r.bottom, left: r.left, right: window.innerWidth - r.right, width: r.width, side });
  }

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  const todayIso = toIso(today);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`dd-trigger dd-${variant} ${rect ? 'open' : ''} ${className}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={!!rect}
        onClick={() => (rect ? setRect(null) : openMenu())}
      >
        <span className={`dd-label ${value ? '' : 'muted'}`}>{value || ph}</span>
        <span className="dd-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </button>
      {rect &&
        createPortal(
          <div
            ref={menuRef}
            className="cal-menu"
            role="dialog"
            style={menuStyle(rect, placeUp, 252)}
          >
            <div className="cal-head">
              <span className="cal-title">
                {MONTHS[view.m]} {view.y}
              </span>
              <span className="cal-nav">
                <button type="button" aria-label={t('common.prevMonth')} onClick={() => shift(-1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button type="button" aria-label={t('common.nextMonth')} onClick={() => shift(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </span>
            </div>
            <div className="cal-grid">
              {DOW.map((d) => (
                <div key={d} className="cal-dow">
                  {d}
                </div>
              ))}
              {cells.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`cal-day ${c.out ? 'out' : ''} ${c.iso === value ? 'sel' : ''} ${c.iso === todayIso ? 'today' : ''}`}
                  onClick={() => {
                    onChange(c.iso);
                    setRect(null);
                  }}
                >
                  {c.day}
                </button>
              ))}
            </div>
            <div className="cal-foot">
              <button type="button" onClick={() => { onChange(todayIso); setRect(null); }}>
                {t('common.today')}
              </button>
              {value && (
                <button type="button" onClick={() => { onChange(''); setRect(null); }}>
                  {t('common.clear')}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
