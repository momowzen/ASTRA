import { useMemo, useRef, useState } from 'react';
import type { DataResponse } from '../types';
import { ApiError, readCpImage, updateCp } from '../api';
import type { CpItem } from '../api';
import { formatCp } from '../utils';
import { useLang } from '../i18n';

interface Props {
  data: DataResponse;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

export default function CpUpdate({ data, toast }: Props) {
  const { t } = useLang();
  const basic = data.tabs.find((tab) => tab.meta.title.toUpperCase() === 'BASIC INFORMATION');

  const roster = useMemo(() => {
    return (basic?.rows ?? [])
      .map((r) => ({ ign: (r.cells[0] || '').trim(), cp: formatCp(r.cells[1] ?? '') }))
      .filter((r) => r.ign)
      .sort((a, b) => a.ign.localeCompare(b.ign));
  }, [basic]);

  const [image, setImage] = useState('');
  const [items, setItems] = useState<CpItem[] | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error('Could not read the file'));
      fr.readAsDataURL(file);
    });
    setImage(dataUrl);
    setItems(null);
    setReading(true);
    try {
      const res = await readCpImage(dataUrl);
      setItems(res.items);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.cpCouldNotRead'), 'err');
    } finally {
      setReading(false);
    }
  }

  function patch(index: number, partial: Partial<CpItem>) {
    setItems((prev) => (prev ? prev.map((it, i) => (i === index ? { ...it, ...partial } : it)) : prev));
  }

  function removeRow(index: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function save() {
    if (!items) return;
    const valid = items.filter((it) => it.ign.trim() && it.cp.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const res = await updateCp(valid.map((it) => ({ ign: it.ign.trim(), cp: it.cp.trim() })));
      toast(`${t('tools.cpSaved')} · ${res.date}`, 'ok');
      setItems(null);
      setImage('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.cpCouldNotSave'), 'err');
    } finally {
      setSaving(false);
    }
  }

  const validCount = (items ?? []).filter((it) => it.ign.trim() && it.cp.trim()).length;
  const matchedCount = (items ?? []).filter((it) => roster.some((r) => r.ign === it.ign.trim()) && it.cp.trim()).length;

  return (
    <div className="boss-view">
      <div className="cp-layout">
        <div className="panel-card">
          <h3>{t('tools.cpLeft')}</h3>
          <div className="cp-list">
            {roster.map((r) => (
              <div className="cp-row" key={r.ign}>
                <span className="cp-ign">{r.ign}</span>
                <span className="cp-val">{r.cp || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <h3>{t('tools.cpRight')}</h3>
          <div className="cp-upload">
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => void onFile(e)} />
            {reading && <span className="spinner" />}
          </div>

          {reading && <div className="cp-reading">{t('tools.cpReading')}</div>}

          {!items && !reading && <div className="empty">{t('tools.cpNoImage')}</div>}

          {items && (
            <>
              <div className="cp-meta">
                {validCount} / {items.length} · {matchedCount} {t('tools.cpMatched')}
              </div>
              <div className="cp-read-list">
                {items.map((it, i) => {
                  const matched = roster.some((r) => r.ign === it.ign.trim()) && !!it.cp.trim();
                  return (
                    <div className="cp-row" key={i}>
                      <span className={`cp-badge ${matched ? 'ok' : 'warn'}`}>
                        {matched ? t('tools.cpMatched') : t('tools.cpUnmatched')}
                      </span>
                      <select
                        className="select"
                        value={it.ign}
                        onChange={(e) => patch(i, { ign: e.target.value })}
                      >
                        {!roster.some((r) => r.ign === it.ign) && (
                          <option value={it.ign}>{it.ign}</option>
                        )}
                        {roster.map((r) => (
                          <option key={r.ign} value={r.ign}>
                            {r.ign}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={it.cp}
                        onChange={(e) => patch(i, { cp: e.target.value })}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        title={t('common.cancel')}
                        onClick={() => removeRow(i)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="cp-actions">
                <button
                  className="btn btn-primary"
                  disabled={saving || validCount === 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  {saving ? <span className="spinner" /> : t('tools.save')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="modal">
            <h3>{t('tools.cpConfirmTitle')}</h3>
            <p className="desc">{t('tools.cpConfirmHint')}</p>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={() => {
                  setConfirmOpen(false);
                  void save();
                }}
              >
                {t('tools.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
