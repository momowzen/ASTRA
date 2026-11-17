import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TabData } from '../types';
import { profileColumns } from '../utils';
import { useLang } from '../i18n';
import { colLabel } from '../display';

interface Props {
  tabs: TabData[];
  ign: string;
  tabText: (raw: string) => string;
  onJump: (tab: string, col: number) => void;
}

export default function ProfileProgress({ tabs, ign, tabText, onJump }: Props) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Anchor the portalled dropdown to the tip button. */
  const place = () => {
    const el = tipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  };

  /* Close on click-away / Escape; re-anchor on resize & scroll. */
  useEffect(() => {
    if (!open) return;
    place();
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (tipRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { pct, groups } = useMemo(() => {
    const want = ign.trim().toLowerCase();
    let total = 0;
    let filled = 0;
    const out: { tab: string; items: { id: string; label: string; tab: string; col: number }[] }[] = [];
    for (const tab of tabs) {
      const cols = profileColumns(tab.meta);
      if (cols.length === 0) continue;
      const row = tab.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === want);
      const items: { id: string; label: string; tab: string; col: number }[] = [];
      for (const c of cols) {
        total += 1;
        if ((row?.cells[c.index] ?? '').trim()) {
          filled += 1;
        } else {
          const sub = colLabel(c.sub, t, lang);
          const label = c.group ? `${colLabel(c.group, t, lang)} · ${sub}` : sub;
          items.push({ id: `${tab.meta.title}#${c.index}`, label, tab: tab.meta.title, col: c.index });
        }
      }
      if (items.length > 0) out.push({ tab: tabText(tab.meta.title), items });
    }
    return { pct: total > 0 ? Math.round((filled / total) * 100) : 0, groups: out };
  }, [tabs, ign, t, lang, tabText]);

  const missingCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="hero-progress">
      <span className="hero-progress-label">{t('member.progressLabel')}</span>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={`progress-fill ${pct >= 100 ? 'done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="hero-progress-pct">{pct}%</span>
      {missingCount === 0 ? (
        <div className="hero-progress-done">{t('member.congrats')}</div>
      ) : (
        <span className="hero-progress-tip-wrap" ref={tipRef}>
          <button
            type="button"
            className="hero-progress-tip"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((v) => !v)}
          >
            {t('member.showMissing')}
            <span className="tip-count">{missingCount}</span>
            <span className={`caret${open ? ' caret--open' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
        </span>
      )}

      {open &&
        pos &&
        createPortal(
          <div
            className="missing-dropdown"
            style={{ top: pos.top, right: pos.right }}
            role="dialog"
            aria-label={t('member.missingTitle')}
            ref={dropdownRef}
          >
            <div className="missing-dropdown-head">
              <h4>{t('member.missingTitle')}</h4>
              <span className="tip-count">{missingCount}</span>
            </div>
            <div className="missing-list missing-list--scroll">
              {groups.map((g) => (
                <div className="missing-group" key={g.tab}>
                  <div className="missing-tab">{g.tab}</div>
                  <div className="missing-items">
                    {g.items.map((item) => (
                      <button
                        type="button"
                        className="missing-item"
                        key={item.id}
                        data-tab={item.tab}
                        data-col={item.col}
                        onClick={() => {
                          onJump(item.tab, item.col);
                          setOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
