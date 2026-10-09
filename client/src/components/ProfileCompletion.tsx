import { useMemo, useState } from 'react';
import type { DataResponse, TabData } from '../types';
import { MEMBER_HIDDEN_TABS } from '../types';
import { memberCompletion, profileColumns } from '../utils';
import { useLang } from '../i18n';
import type { Lang, T } from '../i18n';
import { colLabel, tabLabel } from '../display';

interface Props {
  data: DataResponse;
}

interface Member {
  ign: string;
  guild: string;
  pct: number;
}

const NO_GUILD = '__noguild__';

function missingFor(
  tabs: TabData[],
  ign: string,
  t: T,
  lang: Lang,
): { tab: string; items: string[] }[] {
  const want = ign.trim().toLowerCase();
  const out: { tab: string; items: string[] }[] = [];
  for (const tab of tabs) {
    const cols = profileColumns(tab.meta);
    if (cols.length === 0) continue;
    const row = tab.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === want);
    const items: string[] = [];
    for (const c of cols) {
      if ((row?.cells[c.index] ?? '').trim()) continue;
      const sub = colLabel(c.sub, t, lang);
      items.push(c.group ? `${colLabel(c.group, t, lang)} · ${sub}` : sub);
    }
    if (items.length > 0) out.push({ tab: tabLabel(tab.meta.title, t, lang), items });
  }
  return out;
}

export default function ProfileCompletion({ data }: Props) {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<string | null>(null);

  const memberTabs = useMemo(
    () => data.tabs.filter((x) => !MEMBER_HIDDEN_TABS.includes(x.meta.title.toUpperCase())),
    [data],
  );

  const panels = useMemo(() => {
    const basic = data.tabs.find((x) => x.meta.title.toUpperCase() === 'BASIC INFORMATION');
    if (!basic) return [] as { title: string; members: Member[] }[];

    const hdr = (basic.meta.headers[0] || []).map((h) => String(h).trim().toUpperCase());
    const guildCol = hdr.indexOf('GUILD');
    const options = (guildCol >= 0 ? basic.meta.options?.[guildCol] : undefined) ?? [];

    const members: Member[] = basic.rows
      .map((r) => ({
        ign: (r.cells[0] || '').trim(),
        guild: guildCol >= 0 ? (r.cells[guildCol] || '').trim() : '',
        pct: 0,
      }))
      .filter((m) => m.ign);
    for (const m of members) m.pct = memberCompletion(memberTabs, m.ign);

    const key = (g: string) => g.trim().toLowerCase();
    const groups = new Map<string, { title: string; members: Member[] }>();
    const ensure = (k: string, title: string) => {
      if (!groups.has(k)) groups.set(k, { title, members: [] });
      return groups.get(k)!;
    };

    for (const o of options) {
      const k = key(o);
      if (k) ensure(k, o.trim());
    }
    for (const m of members) {
      if (!m.guild) ensure(NO_GUILD, t('tools.noGuild')).members.push(m);
      else ensure(key(m.guild), m.guild).members.push(m);
    }

    const order: string[] = [];
    const seen = new Set<string>();
    for (const o of options) {
      const k = key(o);
      if (k && !seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    for (const k of groups.keys()) {
      if (k !== NO_GUILD && !seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    if (groups.has(NO_GUILD)) order.push(NO_GUILD);

    return order
      .map((k) => groups.get(k)!)
      .filter((g) => g.members.length > 0)
      .map((g) => ({
        title: g.title,
        members: [...g.members].sort((a, b) => b.pct - a.pct || a.ign.localeCompare(b.ign)),
      }));
  }, [data, t, memberTabs]);

  const missing = useMemo(
    () => (selected ? missingFor(memberTabs, selected, t, lang) : []),
    [selected, memberTabs, t, lang],
  );
  const missingCount = missing.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="completion-view">
      <div className="completion-panels">
        {panels.map((p) => (
          <div className="panel-card completion-panel" key={p.title}>
            <h3>{p.title}</h3>
            <div className="completion-list">
              {p.members.map((m) => (
                <div className="completion-row" key={m.ign}>
                  <button
                    type="button"
                    className="completion-ign"
                    title={m.ign}
                    onClick={() => setSelected(m.ign)}
                  >
                    {m.ign}
                  </button>
                  <span className="progress-track completion-bar">
                    <span
                      className={`progress-fill ${m.pct >= 100 ? 'done' : ''}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </span>
                  <span className="completion-pct">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {panels.length === 0 && (
          <div className="panel-card">
            <div className="empty">{t('tools.empty')}</div>
          </div>
        )}
      </div>

      {selected && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal modal-fixed">
            <h3>{selected}</h3>
            <div className="modal-body">
              {missingCount === 0 ? (
                <p className="desc">{t('member.allComplete')}</p>
              ) : (
                <div className="missing-list">
                  {missing.map((g) => (
                    <div className="missing-group" key={g.tab}>
                      <div className="missing-tab">{g.tab}</div>
                      <div className="missing-items">
                        {g.items.map((it, i) => (
                          <span className="missing-item" key={`${g.tab}#${i}`}>
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
