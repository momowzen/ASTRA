import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityEntry, ActivitySource } from '../types';
import { ApiError, getActivity } from '../api';
import { useLang } from '../i18n';
import { colLabel, tabLabel } from '../display';
import { Select } from './Dropdown';
import { IconClose, IconHistory, IconSearch } from './icons';

const SOURCES: { value: '' | ActivitySource; key: string }[] = [
  { value: '', key: 'activity.allSources' },
  { value: 'profile', key: 'activity.sourceProfile' },
  { value: 'admin', key: 'activity.sourceAdmin' },
  { value: 'sheet', key: 'activity.sourceSheet' },
  { value: 'system', key: 'activity.sourceSystem' },
];

function localeFor(lang: string): string {
  if (lang === 'ko') return 'ko-KR';
  if (lang === 'ja') return 'ja-JP';
  if (lang === 'zh') return 'zh-CN';
  return 'en-US';
}

function sourceKey(source: ActivitySource): string {
  if (source === 'profile') return 'activity.sourceProfile';
  if (source === 'admin') return 'activity.sourceAdmin';
  if (source === 'sheet') return 'activity.sourceSheet';
  return 'activity.sourceSystem';
}

export default function ActivityLog() {
  const { t, lang } = useLang();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ profile: 0, admin: 0, sheet: 0, system: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'' | ActivitySource>('');
  const [tab, setTab] = useState('');
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getActivity(2000);
      setEntries(res.entries);
      setTotal(res.total);
      setCounts(res.counts);
      setLastLoaded(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('activity.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(false), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const tabs = useMemo(() => {
    const names = new Set(entries.map((e) => e.tab).filter(Boolean));
    return [...names].sort((a, b) => tabLabel(a, t, lang).localeCompare(tabLabel(b, t, lang)));
  }, [entries, t, lang]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (source && e.source !== source) return false;
      if (tab && e.tab !== tab) return false;
      if (!needle) return true;
      const haystack = [
        e.actor,
        e.member,
        e.tab,
        e.field,
        e.previous,
        e.next,
        e.action,
        t(sourceKey(e.source)),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [entries, source, tab, query, t]);

  const shown = filtered.slice(0, 500);
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(localeFor(lang), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [lang],
  );

  function formatTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : timeFormat.format(date);
  }

  function actionLabel(entry: ActivityEntry): string {
    if (entry.action === 'row_added') return t('activity.rowAdded');
    if (entry.action === 'row_deleted') return t('activity.rowDeleted');
    return '';
  }

  return (
    <div className="activity-view">
      <div className="activity-hero">
        <div className="activity-hero-copy">
          <span className="activity-kicker">
            <IconHistory /> {t('tools.activityLog')}
          </span>
          <h1>{t('activity.title')}</h1>
          <p>{t('activity.subtitle')}</p>
        </div>
        <div className="activity-hero-actions">
          {lastLoaded && (
            <span className="activity-updated">
              {t('activity.updated', { time: timeFormat.format(lastLoaded) })}
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={loading || refreshing}
            onClick={() => void load(false)}
          >
            {refreshing ? <span className="spinner" /> : t('activity.refresh')}
          </button>
        </div>
      </div>

      <div className="activity-stats">
        <div className="stat-card activity-stat">
          <div className="stat-label">{t('activity.total')}</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card activity-stat activity-stat--profile">
          <div className="stat-label">{t('activity.sourceProfile')}</div>
          <div className="stat-value">{counts.profile}</div>
        </div>
        <div className="stat-card activity-stat activity-stat--admin">
          <div className="stat-label">{t('activity.sourceAdmin')}</div>
          <div className="stat-value">{counts.admin}</div>
        </div>
        <div className="stat-card activity-stat activity-stat--sheet">
          <div className="stat-label">{t('activity.sourceSheet')}</div>
          <div className="stat-value">{counts.sheet}</div>
        </div>
      </div>

      <div className="panel-card activity-filters">
        <div className="activity-search">
          <IconSearch />
          <input
            className="input"
            value={query}
            placeholder={t('activity.searchPh')}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="activity-search-clear"
              aria-label={t('admin.clear')}
              title={t('admin.clear')}
              onClick={() => setQuery('')}
            >
              <IconClose />
            </button>
          )}
        </div>
        <Select
          value={source}
          onChange={(value) => setSource(value as '' | ActivitySource)}
          options={SOURCES.map((s) => ({ value: s.value, label: t(s.key) }))}
          clearable={false}
          ariaLabel={t('activity.source')}
          className="activity-filter-select"
        />
        <Select
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: t('activity.allTabs') },
            ...tabs.map((name) => ({ value: name, label: tabLabel(name, t, lang) })),
          ]}
          clearable={false}
          ariaLabel={t('activity.tab')}
          className="activity-filter-select"
        />
        <span className="activity-count">
          {t('activity.showing', { shown: shown.length, total: filtered.length })}
        </span>
      </div>

      <div className="table-card activity-table-card">
        <div className="table-meta">
          <div className="table-meta-info">
            <span>{t('activity.logTitle')}</span>
          </div>
          <div className="table-meta-right">
            <span className="muted">{t('activity.latestFirst')}</span>
          </div>
        </div>
        <div className="table-scroll activity-table-scroll">
          {loading ? (
            <div className="activity-state">
              <span className="spinner" />
              {t('activity.loading')}
            </div>
          ) : error ? (
            <div className="activity-state activity-state--error">{error}</div>
          ) : shown.length === 0 ? (
            <div className="activity-state">
              <div className="big">
                <IconHistory />
              </div>
              {entries.length === 0 ? t('activity.empty') : t('activity.noMatches')}
            </div>
          ) : (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>{t('activity.when')}</th>
                  <th>{t('activity.source')}</th>
                  <th>{t('activity.member')}</th>
                  <th>{t('activity.field')}</th>
                  <th>{t('activity.previous')}</th>
                  <th>{t('activity.next')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((entry) => {
                  const action = actionLabel(entry);
                  return (
                    <tr key={entry.id}>
                      <td className="activity-time" data-label={t('activity.when')}>
                        {formatTime(entry.at)}
                      </td>
                      <td data-label={t('activity.source')}>
                        <span className={`activity-source activity-source--${entry.source}`}>
                          {t(sourceKey(entry.source))}
                        </span>
                        <span className="activity-actor">{entry.actor}</span>
                      </td>
                      <td className="activity-member" data-label={t('activity.member')}>
                        {entry.member || '—'}
                      </td>
                      <td data-label={t('activity.field')}>
                        <div className="activity-field">
                          <span className="activity-tab">{tabLabel(entry.tab, t, lang)}</span>
                          <span className="activity-field-name">
                            {colLabel(entry.field, t, lang)}
                            {entry.column > 0 && (
                              <small>
                                R{entry.row} · C{entry.column}
                              </small>
                            )}
                          </span>
                          {action && <span className="activity-action">{action}</span>}
                        </div>
                      </td>
                      <td data-label={t('activity.previous')}>
                        <span
                          className={`activity-value${entry.previous ? '' : ' is-empty'}`}
                          title={entry.previous}
                        >
                          {entry.previous || '—'}
                        </span>
                      </td>
                      <td data-label={t('activity.next')}>
                        <span
                          className={`activity-value activity-value--new${entry.next ? '' : ' is-empty'}`}
                          title={entry.next}
                        >
                          {entry.next || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
