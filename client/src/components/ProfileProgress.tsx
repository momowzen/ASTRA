import { useMemo, useState } from 'react';
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
      <div className="hero-progress-head">
        <span className="hero-progress-label">{t('member.progressLabel')}</span>
        <span className="hero-progress-pct">{pct}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={`progress-fill ${pct >= 100 ? 'done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      {missingCount === 0 ? (
        <div className="hero-progress-done">{t('member.congrats')}</div>
      ) : (
        <button type="button" className="hero-progress-tip" onClick={() => setOpen(true)}>
          {t('member.showMissing')}
          <span className="caret">▾</span>
        </button>
      )}

      {open && missingCount > 0 && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-fixed">
            <h3>{t('member.missingTitle')}</h3>
            <div className="modal-body">
              {missingCount === 0 ? (
                <p className="desc">{t('member.allComplete')}</p>
              ) : (
                <div className="missing-list">
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
              )}
            </div>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
