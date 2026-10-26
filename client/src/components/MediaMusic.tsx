import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent } from 'react';
import { ApiError, apiBase, getMedia } from '../api';
import type { MediaResponse } from '../types';
import { useLang } from '../i18n';
import { IconClose, IconMusic, IconRefresh, IconSearch } from './icons';
import MusicStarfield from './MusicStarfield';

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
    </svg>
  );
}

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 20 9 12l10-8z" />
      <path d="M5 19V5" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 4 10 8-10 8z" />
      <path d="M19 5v14" />
    </svg>
  );
}

function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function IconRepeat({ one = false }: { one?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      {one && <path d="M12 10v4" />}
    </svg>
  );
}

function IconVolume({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      {muted ? (
        <>
          <path d="m17 9 5 6" />
          <path d="m22 9-5 6" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </svg>
  );
}

function IconCompress() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4v5H4" />
      <path d="M15 4v5h5" />
      <path d="M9 20v-5H4" />
      <path d="M15 20v-5h5" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface MediaMusicProps {
  active?: boolean;
  backgroundPlay?: boolean;
  onBackgroundChange?: (enabled: boolean) => void;
  onNowPlayingChange?: (info: { title: string; artist: string; playing: boolean } | null) => void;
}

export default function MediaMusic({
  active = true,
  backgroundPlay = false,
  onBackgroundChange,
  onNowPlayingChange,
}: MediaMusicProps) {
  const { t } = useLang();
  const [library, setLibrary] = useState<MediaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('astra.music.volume'));
      return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.78;
    } catch {
      return 0.78;
    }
  });
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [streamError, setStreamError] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const [fsList, setFsList] = useState(false);
  const [fsChrome, setFsChrome] = useState(true);
  const fsChromeTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const playerSwipeRef = useRef<{ x: number; y: number; blocked: boolean } | null>(null);
  const listSwipeRef = useRef<{ x: number; y: number; blocked: boolean; scrollTop: number } | null>(null);
  const autoPlayRef = useRef(false);
  const backgroundPlayRef = useRef(backgroundPlay);
  const resumeOnVisibleRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const tracks = useMemo(() => library?.tracks ?? [], [library]);
  const current = tracks[index] ?? null;
  const currentStream = current ? `${apiBase()}${current.stream}` : undefined;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isMuted = muted || volume === 0;
  const volumePct = (isMuted ? 0 : volume) * 100;
  const coverStyle = useMemo(() => {
    const key = current?.id ?? 'astra-cover';
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return {
      '--cover-hue': `${hue}`,
      '--cover-hue-2': `${(hue + 58) % 360}`,
    } as CSSProperties;
  }, [current?.id]);
  const fabBounceStyle = useMemo(
    () =>
      ({
        '--music-fab-delay': `${(0.15 + Math.random() * 0.9).toFixed(2)}s`,
        '--music-fab-duration': `${(2.1 + Math.random() * 1.1).toFixed(2)}s`,
      }) as CSSProperties,
    [],
  );

  const enterFs = useCallback(() => {
    setMobileListOpen(false);
    setFs(true);
    setFsList(false);
    setFsChrome(true);
  }, []);

  const exitFs = useCallback(() => {
    setMobileListOpen(false);
    setFs(false);
    setFsList(false);
    setFsChrome(true);
  }, []);

  const toggleFsList = useCallback(() => {
    setFsList((value) => !value);
    setFsChrome(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMedia();
      setLibrary(res);
      setIndex(0);
      setCurrentTime(0);
      setDuration(0);
      setPlaying(false);
      setBuffering(false);
      setStreamError(false);
      setDurations({});
      setMobileListOpen(false);
      setSearchOpen(false);
      setQuery('');
      searchInputRef.current?.blur();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      const context = audioCtxRef.current;
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      if (context && context.state !== 'closed') {
        void context.close().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    onNowPlayingChange?.(current ? { title: current.title, artist: current.artist, playing } : null);
  }, [current, playing, onNowPlayingChange]);

  useEffect(() => {
    return () => onNowPlayingChange?.(null);
  }, [onNowPlayingChange]);

  useEffect(() => {
    backgroundPlayRef.current = backgroundPlay;
  }, [backgroundPlay]);

  useEffect(() => {
    if (active) return;
    setMobileListOpen(false);
    setSearchOpen(false);
    setQuery('');
    setFs(false);
    setFsList(false);
    setFsChrome(true);
    searchInputRef.current?.blur();
  }, [active]);

  useEffect(() => {
    if (!fs) {
      setFsChrome(true);
      return;
    }

    const armHide = () => {
      setFsChrome(true);
      if (fsChromeTimer.current !== null) window.clearTimeout(fsChromeTimer.current);
      fsChromeTimer.current = window.setTimeout(() => setFsChrome(false), 2600);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Let an open search field swallow the first Escape.
      if (searchOpen) return;
      event.preventDefault();
      exitFs();
    };

    armHide();
    document.addEventListener('pointermove', armHide, { passive: true });
    document.addEventListener('pointerdown', armHide, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointermove', armHide);
      document.removeEventListener('pointerdown', armHide);
      document.removeEventListener('keydown', onKeyDown);
      if (fsChromeTimer.current !== null) {
        window.clearTimeout(fsChromeTimer.current);
        fsChromeTimer.current = null;
      }
    };
  }, [fs, searchOpen, exitFs]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const close = () => {
      setSearchOpen(false);
      setQuery('');
      searchInputRef.current?.blur();
    };
    const onClickOutside = (event: MouseEvent) => {
      if (searchRef.current?.contains(event.target as Node)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        if (!backgroundPlayRef.current && !audio.paused) {
          resumeOnVisibleRef.current = true;
          audio.pause();
        }
        return;
      }
      if (resumeOnVisibleRef.current) {
        resumeOnVisibleRef.current = false;
        if (!backgroundPlayRef.current && audio.paused) {
          void audio.play().catch(() => undefined);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(0);
    setStreamError(false);
    setBuffering(false);
    if (!current || !currentStream) {
      audio.removeAttribute('src');
      return;
    }
    audio.crossOrigin = 'anonymous';
    audio.src = currentStream;
    audio.load();
    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      const start = () => {
        void audio.play().catch(() => {
          setPlaying(false);
          setBuffering(false);
          setStreamError(true);
        });
      };
      if (audio.readyState >= 2) start();
      else audio.addEventListener('canplay', start, { once: true });
    }
  }, [current?.id, currentStream]);

  useEffect(() => {
    if (!tracks.length) return;
    let cancelled = false;
    let cursor = 0;
    const pending = new Set<HTMLAudioElement>();
    const concurrency = 4;

    const loadNext = () => {
      if (cancelled) return;
      while (pending.size < concurrency && cursor < tracks.length) {
        const track = tracks[cursor];
        cursor += 1;
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.volume = 0;
        pending.add(audio);

        const finish = () => {
          audio.onloadedmetadata = null;
          audio.onerror = null;
          pending.delete(audio);
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          loadNext();
        };

        audio.onloadedmetadata = () => {
          const value = audio.duration;
          if (Number.isFinite(value) && value > 0) {
            setDurations((previous) => (previous[track.id] ? previous : { ...previous, [track.id]: value }));
          }
          finish();
        };
        audio.onerror = finish;
        audio.src = `${apiBase()}${track.stream}`;
        audio.load();
      }
    };

    loadNext();

    return () => {
      cancelled = true;
      for (const audio of pending) {
        audio.onloadedmetadata = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      pending.clear();
    };
  }, [tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = isMuted ? 0 : volume;
    try {
      localStorage.setItem('astra.music.volume', String(volume));
    } catch {
      // Storage is optional.
    }
  }, [volume, muted, library]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks
      .map((track, i) => ({ track, i }))
      .filter(({ track }) => !q || track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q));
  }, [tracks, query]);

  function ensureAnalyser(): AnalyserNode | null {
    const audio = audioRef.current;
    if (!audio) return null;

    const existing = analyserRef.current;
    if (existing) {
      const context = audioCtxRef.current;
      if (context && context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }
      return existing;
    }

    const AudioCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;

    try {
      const context = new AudioCtor();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyser.connect(context.destination);
      audioCtxRef.current = context;
      sourceRef.current = source;
      analyserRef.current = analyser;
      void context.resume().catch(() => undefined);
      return analyser;
    } catch {
      return null;
    }
  }

  function rememberDuration(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    setDuration(value);
    if (current) {
      setDurations((previous) => (previous[current.id] ? previous : { ...previous, [current.id]: value }));
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      ensureAnalyser();
      void audio.play().catch(() => {
        setPlaying(false);
        setStreamError(true);
      });
    } else {
      audio.pause();
    }
  }

  function selectTrack(nextIndex: number) {
    if (nextIndex === index) {
      togglePlay();
      return;
    }
    ensureAnalyser();
    autoPlayRef.current = true;
    setIndex(nextIndex);
  }

  function goNext(auto = false) {
    if (!tracks.length) return;
    if (auto && repeat === 'one') {
      const audio = audioRef.current;
      if (audio) {
        ensureAnalyser();
        audio.currentTime = 0;
        void audio.play().catch(() => setStreamError(true));
      }
      return;
    }

    let next = index;
    if (shuffle && tracks.length > 1) {
      do {
        next = Math.floor(Math.random() * tracks.length);
      } while (next === index);
    } else if (index < tracks.length - 1) {
      next = index + 1;
    } else if (repeat === 'all' || !auto) {
      next = 0;
    } else {
      setPlaying(false);
      return;
    }

    ensureAnalyser();
    autoPlayRef.current = true;
    setIndex(next);
  }

  function goPrev() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (!tracks.length) return;

    let next = index;
    if (shuffle && tracks.length > 1) {
      do {
        next = Math.floor(Math.random() * tracks.length);
      } while (next === index);
    } else if (index > 0) {
      next = index - 1;
    } else if (repeat === 'all') {
      next = tracks.length - 1;
    }

    if (next === index) {
      if (audio) audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    ensureAnalyser();
    autoPlayRef.current = true;
    setIndex(next);
  }

  function cycleRepeat() {
    setRepeat((value) => (value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'));
  }

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery('');
      searchInputRef.current?.blur();
      return;
    }
    setSearchOpen(true);
  }

  function clearSearch() {
    setQuery('');
    searchInputRef.current?.focus();
  }

  function showTracks() {
    setMobileListOpen(true);
  }

  function hideTracks() {
    setMobileListOpen(false);
    setFsList(false);
    setSearchOpen(false);
    setQuery('');
    searchInputRef.current?.blur();
  }

  function onPlayerTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (fs || window.innerWidth > 900) return;
    const touch = e.touches[0];
    if (!touch) return;
    const target = e.target as HTMLElement;
    const blocked = Boolean(target.closest('input, textarea, select, button, a, [role="slider"]'));
    playerSwipeRef.current = { x: touch.clientX, y: touch.clientY, blocked };
  }

  function onPlayerTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = playerSwipeRef.current;
    playerSwipeRef.current = null;
    if (!start || start.blocked) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (dy < -54 && Math.abs(dy) > Math.abs(dx) * 1.35) {
      showTracks();
    }
  }

  function onListTouchStart(e: TouchEvent<HTMLElement>) {
    if (window.innerWidth > 900) return;
    const touch = e.touches[0];
    if (!touch) return;
    const target = e.target as HTMLElement;
    const blocked = Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    listSwipeRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      blocked,
      scrollTop: listRef.current?.scrollTop ?? 0,
    };
  }

  function onListTouchEnd(e: TouchEvent<HTMLElement>) {
    const start = listSwipeRef.current;
    listSwipeRef.current = null;
    if (!start || start.blocked) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (dy > 54 && Math.abs(dy) > Math.abs(dx) * 1.35 && start.scrollTop <= 0) {
      hideTracks();
    }
  }

  function toggleBackgroundPlay() {
    const next = !backgroundPlay;
    backgroundPlayRef.current = next;
    onBackgroundChange?.(next);
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <section className={`music-view${active ? '' : ' is-hidden'}`} aria-hidden={active ? undefined : true}>
      <div
        className={`panel-card music-shell${mobileListOpen ? ' is-list-open' : ''}${fs ? ' is-fs' : ''}${
          fs && !fsChrome ? ' is-idle' : ''
        }${fs && fsList ? ' is-fs-list' : ''}`}
      >
        {active && <MusicStarfield analyserRef={analyserRef} playing={playing} />}
        <header className="music-head">
          <div className="music-head-copy">
            <h2>ASTRA MUSIC</h2>
          </div>
          {tracks.length > 0 && !fs && (
            <button
              type="button"
              className="music-fs-btn"
              aria-label={t('media.fullscreen')}
              title={t('media.fullscreen')}
              onClick={enterFs}
            >
              <IconExpand />
            </button>
          )}
        </header>

        {loading ? (
          <div className="music-state music-state--loading">
            <span className="music-spinner" aria-hidden="true" />
            <span>{t('media.loading')}</span>
          </div>
        ) : error ? (
          <div className="music-state">
            <div className="music-state-icon">
              <IconMusic />
            </div>
            <strong>{t('media.error')}</strong>
            {error && <span className="music-state-note">{error}</span>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
              <IconRefresh />
              {t('media.retry')}
            </button>
          </div>
        ) : tracks.length === 0 ? (
          <div className="music-state">
            <div className="music-state-icon">
              <IconMusic />
            </div>
            <strong>{t('media.empty')}</strong>
          </div>
        ) : (
          <div className="music-layout">
            <div
              className="music-now"
              onTouchStart={onPlayerTouchStart}
              onTouchEnd={onPlayerTouchEnd}
              onTouchCancel={() => {
                playerSwipeRef.current = null;
              }}
            >
              <div className="music-cover-wrap">
                <div className="music-cover" style={coverStyle}>
                  <img src="./assets/logo.png" alt="" />
                  <span className="music-cover-label">ASTRA</span>
                  <span className="music-cover-sub">SONGS</span>
                </div>
                <div className="music-cover-index">
                  {String(index + 1).padStart(2, '0')}
                  <span>/ {String(tracks.length).padStart(2, '0')}</span>
                </div>
              </div>

              <div className="music-now-info">
                <div className="music-track-copy">
                  <span className="music-kicker">{t('media.nowPlaying')}</span>
                  <h3>{current?.title || '—'}</h3>
                  <div className="music-track-meta">
                    <span>{current?.artist || 'ASTRA'}</span>
                    <span className="music-dot" aria-hidden="true" />
                    <span>{current?.modified || t('media.drive')}</span>
                  </div>
                </div>
              </div>

              <div className="music-progress">
                <div className="music-progress-row">
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
                </div>
                <input
                  className="music-range"
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  disabled={duration <= 0}
                  aria-label={t('media.nowPlaying')}
                  style={{ '--music-progress': `${progressPct}%` } as CSSProperties}
                  onChange={(e) => seek(Number(e.target.value))}
                />
              </div>

              <div className="music-controls">
                <button
                  type="button"
                  className={`music-control music-control--shuffle${shuffle ? ' is-on' : ''}`}
                  aria-label={t('media.shuffle')}
                  aria-pressed={shuffle}
                  title={t('media.shuffle')}
                  onClick={() => setShuffle((value) => !value)}
                >
                  <IconShuffle />
                </button>
                <button type="button" className="music-control music-control--prev" aria-label={t('media.prev')} title={t('media.prev')} onClick={goPrev}>
                  <IconPrev />
                </button>
                <button
                  type="button"
                  className="music-control music-control--play"
                  aria-label={playing ? t('media.pause') : t('media.play')}
                  title={playing ? t('media.pause') : t('media.play')}
                  onClick={togglePlay}
                >
                  {buffering ? <span className="music-spinner" aria-hidden="true" /> : playing ? <IconPause /> : <IconPlay />}
                </button>
                <button type="button" className="music-control music-control--next" aria-label={t('media.next')} title={t('media.next')} onClick={() => goNext(false)}>
                  <IconNext />
                </button>
                <button
                  type="button"
                  className={`music-control music-control--repeat${repeat !== 'off' ? ' is-on' : ''}`}
                  aria-label={repeat === 'one' ? t('media.repeatOne') : t('media.repeat')}
                  aria-pressed={repeat !== 'off'}
                  title={repeat === 'one' ? t('media.repeatOne') : t('media.repeat')}
                  onClick={cycleRepeat}
                >
                  <IconRepeat one={repeat === 'one'} />
                </button>
              </div>

              <div className="music-volume">
                <button
                  type="button"
                  className="music-volume-btn"
                  aria-label={isMuted ? t('media.unmute') : t('media.mute')}
                  title={isMuted ? t('media.unmute') : t('media.mute')}
                  onClick={() => {
                    if (isMuted) {
                      setMuted(false);
                      if (volume === 0) setVolume(0.5);
                    } else {
                      setMuted(true);
                    }
                  }}
                >
                  <IconVolume muted={isMuted} />
                </button>
                <input
                  className="music-range music-range--volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  aria-label={t('media.volume')}
                  style={{ '--music-progress': `${volumePct}%` } as CSSProperties}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setVolume(next);
                    setMuted(next === 0);
                  }}
                />
                <span className="music-volume-value">{Math.round(volumePct)}%</span>
                <button
                  type="button"
                  className={`music-bg-toggle${backgroundPlay ? ' is-on' : ''}`}
                  aria-label={t('media.backgroundPlay')}
                  aria-pressed={backgroundPlay}
                  title={t('media.backgroundPlay')}
                  onClick={toggleBackgroundPlay}
                >
                  BG
                </button>
              </div>

              {fs && (
                <>
                  <button
                    type="button"
                    className="music-fs-btn music-fs-btn--icon music-fs-btn--list"
                    aria-pressed={fsList}
                    aria-label={fsList ? t('media.hideTracks') : t('media.showTracks')}
                    title={fsList ? t('media.hideTracks') : t('media.showTracks')}
                    onClick={toggleFsList}
                  >
                    <IconList />
                  </button>
                  <button
                    type="button"
                    className="music-fs-btn music-fs-btn--icon music-fs-btn--exit"
                    aria-label={t('media.exitFullscreen')}
                    title={t('media.exitFullscreen')}
                    onClick={exitFs}
                  >
                    <IconCompress />
                  </button>
                </>
              )}

              {streamError && <div className="music-alert">{t('media.streamError')}</div>}

              <audio
                ref={audioRef}
                crossOrigin="anonymous"
                preload="metadata"
                onLoadedMetadata={(e) => rememberDuration(e.currentTarget.duration)}
                onDurationChange={(e) => rememberDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => {
                  setPlaying(true);
                  setStreamError(false);
                }}
                onPause={() => {
                  setPlaying(false);
                  setBuffering(false);
                }}
                onWaiting={() => setBuffering(true)}
                onCanPlay={() => setBuffering(false)}
                onPlaying={() => setBuffering(false)}
                onEnded={() => goNext(true)}
                onError={() => {
                  setPlaying(false);
                  setBuffering(false);
                  setStreamError(true);
                }}
              />
            </div>

            <aside
              id="music-track-list"
              className="music-playlist"
              onTouchStart={onListTouchStart}
              onTouchEnd={onListTouchEnd}
              onTouchCancel={() => {
                listSwipeRef.current = null;
              }}
            >
              <div className="music-playlist-head">
                <h3>{t('media.tracks')}</h3>
                <div className="music-playlist-actions">
                  <div
                    ref={searchRef}
                    className={`music-search-expand${searchOpen ? ' is-open' : ''}`}
                    role="search"
                  >
                    <input
                      id="music-search"
                      ref={searchInputRef}
                      value={query}
                      tabIndex={searchOpen ? 0 : -1}
                      aria-hidden={searchOpen ? undefined : true}
                      autoComplete="off"
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('media.searchPh')}
                      aria-label={t('media.searchPh')}
                    />
                    {query.trim() !== '' && (
                      <button
                        type="button"
                        className="music-search-clear"
                        aria-label={t('common.clear')}
                        onClick={clearSearch}
                      >
                        <IconClose />
                      </button>
                    )}
                    <button
                      type="button"
                      className="music-search-toggle"
                      aria-label={searchOpen ? t('media.closeSearch') : t('media.searchPh')}
                      aria-expanded={searchOpen}
                      aria-controls="music-search"
                      title={searchOpen ? t('media.closeSearch') : t('media.searchPh')}
                      onClick={toggleSearch}
                    >
                      <IconSearch />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="music-list-hide"
                    aria-label={t('media.hideTracks')}
                    title={t('media.hideTracks')}
                    onClick={hideTracks}
                  >
                    <IconChevronDown />
                  </button>
                </div>
              </div>

              <div className="music-list" ref={listRef}>
                {filtered.length === 0 ? (
                  <div className="music-list-empty">{t('media.noResults')}</div>
                ) : (
                  filtered.map(({ track, i }) => {
                    const isCurrent = i === index;
                    const length = durations[track.id] ?? (isCurrent ? duration : 0);
                    return (
                      <button
                        key={track.id}
                        type="button"
                        className={`music-row${isCurrent ? ' is-active' : ''}`}
                        aria-current={isCurrent ? 'true' : undefined}
                        onClick={() => selectTrack(i)}
                      >
                        <span className="music-row-index">
                          {isCurrent && playing ? (
                            <span className="music-row-eq" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : (
                            String(i + 1).padStart(2, '0')
                          )}
                        </span>
                        <span className="music-row-copy">
                          <span className="music-row-title">{track.title}</span>
                          <span className="music-row-artist">{track.artist}</span>
                        </span>
                        <span className="music-row-meta">{length > 0 ? formatTime(length) : '--:--'}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <button
            type="button"
            className={`music-list-fab${mobileListOpen ? ' is-off' : ''}`}
            aria-label={t('media.showTracks')}
            aria-controls="music-track-list"
            aria-hidden={mobileListOpen || undefined}
            title={t('media.showTracks')}
            style={fabBounceStyle}
            disabled={mobileListOpen}
            onClick={showTracks}
          >
            <IconChevronUp />
          </button>
        )}

        {fs && (
          <button
            type="button"
            className="music-fs-btn music-fs-btn--icon music-fs-float"
            aria-label={t('media.exitFullscreen')}
            title={t('media.exitFullscreen')}
            onClick={exitFs}
          >
            <IconCompress />
          </button>
        )}
      </div>
    </section>
  );
}
