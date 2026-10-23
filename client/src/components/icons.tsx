import type { ReactNode } from 'react';

export function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function IconCamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg className="nav-ico nav-ico-plus" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path className="plus-v" d="M12 5v14" />
      <path className="plus-h" d="M5 12h14" />
    </svg>
  );
}

export function IconGrid(): ReactNode {
  return (
    <svg className="nav-ico nav-ico-grid" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect className="grid-frame" x="3" y="3" width="18" height="18" rx="2" />
      <path className="grid-h" d="M3 9h18" />
      <path className="grid-v" d="M9 3v18" />
    </svg>
  );
}

export function IconGear() {
  return (
    <svg className="nav-ico nav-ico-gear" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.09a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.09a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg className="nav-ico nav-ico-logout" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path className="logout-door" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path className="logout-arrow" d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="logout-shaft" d="M21 12H9" strokeLinecap="round" />
    </svg>
  );
}

export function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function IconBulb() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 00-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0012 3z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg className="nav-ico nav-ico-profile" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle className="pc-head" cx="12" cy="8" r="5" />
      <path className="pc-body" d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export function IconUsers() {
  return (
    <svg className="nav-ico nav-ico-users" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="users-body" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path className="users-arm users-arm-r" d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path className="users-arm users-arm-l" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle className="users-head" cx="9" cy="7" r="4" />
    </svg>
  );
}

export function IconTimer() {
  return (
    <svg className="nav-ico nav-ico-timer" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line className="timer-top" x1="10" x2="14" y1="2" y2="2" />
      <line className="timer-hand" x1="12" x2="15" y1="14" y2="11" />
      <circle className="timer-ring" cx="12" cy="14" r="8" />
    </svg>
  );
}

export function IconSparkles() {
  return (
    <svg className="nav-ico nav-ico-spark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="spark-main" d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path className="spark-plus spark-plus-v" d="M20 2v4" />
      <path className="spark-plus spark-plus-h" d="M22 4h-4" />
      <circle className="spark-dot" cx="4" cy="20" r="2" />
    </svg>
  );
}

export function IconGem() {
  return (
    <svg className="nav-ico nav-ico-gem" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="gem-facet" d="M10.5 3 8 9l4 13 4-13-2.5-6" />
      <path className="gem-body" d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" />
      <path className="gem-line" d="M2 9h20" />
    </svg>
  );
}

export function IconSheet() {
  return (
    <svg className="nav-ico nav-ico-grid" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect className="grid-frame" width="18" height="18" x="3" y="3" rx="2" />
      <line className="grid-h" x1="3" x2="21" y1="9" y2="9" />
      <line className="grid-h" x1="3" x2="21" y1="15" y2="15" />
      <line className="grid-v" x1="9" x2="9" y1="9" y2="21" />
      <line className="grid-v" x1="15" x2="15" y1="9" y2="21" />
    </svg>
  );
}

export function IconTrophy() {
  return (
    <svg className="nav-ico nav-ico-trophy" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="trophy-stem" d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" />
      <path className="trophy-stem" d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" />
      <path className="trophy-handle trophy-handle-r" d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" />
      <path className="trophy-base" d="M4 22h16" />
      <path className="trophy-cup" d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
      <path className="trophy-handle trophy-handle-l" d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" />
    </svg>
  );
}

export function IconOverview() {
  return (
    <svg className="nav-ico nav-ico-overview" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect className="ov-tile" width="7" height="9" x="3" y="3" rx="1" />
      <rect className="ov-tile" width="7" height="5" x="14" y="3" rx="1" />
      <rect className="ov-tile" width="7" height="9" x="14" y="12" rx="1" />
      <rect className="ov-tile" width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export function IconUserCheck() {
  return (
    <svg className="nav-ico nav-ico-profile" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="pc-body" d="M2 21a8 8 0 0 1 13.292-6" />
      <circle className="pc-head" cx="10" cy="8" r="5" />
      <path className="pc-check" d="m16 19 2 2 4-4" />
    </svg>
  );
}

export function IconTrendingUp() {
  return (
    <svg className="nav-ico nav-ico-cp" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="cp-arrow" d="M16 7h6v6" />
      <path className="cp-line" d="m22 7-8.5 8.5-5-5L2 17" />
    </svg>
  );
}
