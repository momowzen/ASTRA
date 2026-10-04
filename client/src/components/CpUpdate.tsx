import { useMemo, useRef, useState } from 'react';
import type { DataResponse } from '../types';
import { ApiError, updateCp } from '../api';
import type { CpItem } from '../api';
import { formatCp } from '../utils';
import { useLang } from '../i18n';
import { ocrVariants, mergeVariants } from '../ocr';
import type { ScannedRow } from '../ocr';

interface Props {
  data: DataResponse;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

interface Screenshot {
  name: string;
  dataUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.readAsDataURL(file);
  });
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

  const [images, setImages] = useState<Screenshot[]>([]);
  const [items, setItems] = useState<CpItem[] | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [manualCp, setManualCp] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openManual(ign: string, cp: string) {
    setManual(ign);
    setManualCp(cp.replace(/[^\d]/g, ''));
  }

  async function saveManual() {
    if (!manual) return;
    const cp = formatCp(manualCp);
    if (!cp) return;
    setManualSaving(true);
    try {
      const res = await updateCp([{ ign: manual, cp }]);
      toast(`${t('tools.cpSaved')} · ${res.date}`, 'ok');
      setManual(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.cpCouldNotSave'), 'err');
    } finally {
      setManualSaving(false);
    }
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const loaded: Screenshot[] = [];
    for (const f of files) {
      try {
        loaded.push({ name: f.name, dataUrl: await fileToDataUrl(f) });
      } catch {
        toast(t('tools.cpCouldNotRead'), 'err');
      }
    }
    setImages((prev) => [...prev, ...loaded]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function readAll() {
    if (images.length === 0) return;
    setReading(true);
    setItems(null);
    try {
      const igns = roster.map((r) => r.ign);
      const best = new Map<string, ScannedRow>();
      for (const img of images) {
        const variants = await ocrVariants(img.dataUrl);
        for (const row of mergeVariants(variants, igns)) {
          if (!row.ign || !row.cp) continue;
          const key = row.ign.toLowerCase();
          const prev = best.get(key);
          if (!prev || row.score > prev.score || (row.score === prev.score && row.size > prev.size)) {
            best.set(key, row);
          }
        }
      }
      const all: CpItem[] = [...best.values()].map((row) => ({
        ign: row.ign,
        cp: formatCp(row.cp),
        matched: row.matched,
      }));
      if (all.length > 0) {
        all.sort((a, b) => Number(a.matched) - Number(b.matched));
        setItems(all);
      } else {
        setItems(null);
        toast(t('tools.cpCouldNotRead'), 'err');
      }
    } catch {
      setItems(null);
      toast(t('tools.cpCouldNotRead'), 'err');
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
      setImages([]);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.cpCouldNotSave'), 'err');
    } finally {
      setSaving(false);
    }
  }

  const validCount = (items ?? []).filter((it) => it.ign.trim() && it.cp.trim()).length;
  const matchedCount = (items ?? []).filter(
    (it) => roster.some((r) => r.ign === it.ign.trim()) && it.cp.trim(),
  ).length;

  return (
    <div className="cp-update">
      <div className="cp-layout">
        <div className="panel-card">
          <h3>{t('tools.cpLeft')}</h3>
          <div className="cp-list">
            {roster.map((r) => (
              <div className="cp-row" key={r.ign}>
                <button
                  type="button"
                  className="cp-ign"
                  title={t('tools.cpManualEdit')}
                  onClick={() => openManual(r.ign, r.cp)}
                >
                  {r.ign}
                </button>
                <span className="cp-val">{r.cp || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <h3>{t('tools.cpRight')}</h3>
          <div className="cp-upload">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => void onFiles(e)} />
            <button
              className="btn btn-primary btn-sm"
              disabled={reading || images.length === 0}
              onClick={() => void readAll()}
            >
              {reading ? <span className="spinner" /> : t('tools.cpRead')}
            </button>
          </div>

          {images.length > 0 && (
            <div className="cp-thumbs">
              {images.map((img, i) => (
                <div className="cp-thumb" key={i}>
                  <img src={img.dataUrl} alt={img.name} title={img.name} />
                  <button type="button" className="cp-thumb-x" onClick={() => removeImage(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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

      {manual && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setManual(null)}>
          <div className="modal">
            <h3>{manual}</h3>
            <p className="desc">{t('tools.cpManualHint')}</p>
            <div className="field">
              <label htmlFor="manual-cp">{t('tools.cpManualLabel')}</label>
              <input
                id="manual-cp"
                className="input"
                inputMode="numeric"
                value={manualCp}
                autoFocus
                onFocus={(e) => e.target.select()}
                onChange={(e) => setManualCp(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void saveManual();
                  }
                }}
              />
            </div>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setManual(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                disabled={manualSaving || !manualCp}
                onClick={() => void saveManual()}
              >
                {manualSaving ? <span className="spinner" /> : t('tools.save')}
              </button>
            </div>
          </div>
        </div>
      )}

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
