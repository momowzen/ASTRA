import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ko';

const LANG_KEY = 'astra.lang';

const DICT: Record<string, { en: string; ko: string }> = {
  // ---- app ----
  'app.connectionLost': { en: 'connection lost', ko: '연결 끊김' },
  'app.waiting': { en: 'waiting for data…', ko: '데이터 대기 중…' },
  'app.live': { en: 'live', ko: '실시간' },
  'app.sheetUpdated': { en: 'Sheet updated — view refreshed', ko: '시트가 업데이트되어 화면을 새로고침했습니다' },
  'app.connectionProblem': { en: 'Connection problem', ko: '연결 문제' },
  'app.retry': { en: 'Retry', ko: '다시 시도' },
  'app.loadingData': { en: 'Loading guild data…', ko: '길드 데이터 로딩 중…' },
  'app.noTabs': { en: 'No tabs found', ko: '탭을 찾을 수 없습니다' },
  'app.noTabsDesc': {
    en: 'The spreadsheet has no visible tabs, or the service account lost access.',
    ko: '스프레드시트에 표시되는 탭이 없거나 서비스 계정 접근 권한이 상실되었습니다.',
  },

  // ---- common ----
  'common.signOut': { en: 'Sign out', ko: '로그아웃' },
  'common.settings': { en: 'Settings', ko: '설정' },
  'common.cancel': { en: 'Cancel', ko: '취소' },
  'common.saving': { en: 'Saving…', ko: '저장 중…' },
  'common.saved': { en: 'Saved', ko: '저장됨' },
  'common.failed': { en: 'Failed', ko: '실패' },

  // ---- login ----
  'login.tag': { en: 'Guild Manager', ko: '길드 관리자' },
  'login.welcome': { en: 'Welcome back', ko: '다시 오신 것을 환영합니다' },
  'login.sub': {
    en: 'Sign in to manage the guild roster and your profile.',
    ko: '길드 로스터와 프로필을 관리하려면 로그인하세요.',
  },
  'login.username': { en: 'Username', ko: '아이디' },
  'login.usernamePh': { en: 'admin or your IGN', ko: 'admin 또는 IGN' },
  'login.password': { en: 'Password', ko: '비밀번호' },
  'login.signIn': { en: 'Sign in', ko: '로그인' },
  'login.members': { en: 'Members', ko: '멤버' },
  'login.hint': {
    en: 'your username and initial password are both your IGN. You can change your password from your profile settings after signing in.',
    ko: '아이디와 초기 비밀번호는 모두 IGN입니다. 로그인 후 프로필 설정에서 비밀번호를 변경할 수 있습니다.',
  },
  'login.failed': { en: 'Login failed', ko: '로그인에 실패했습니다' },

  // ---- admin ----
  'admin.trackerSection': { en: 'Boss Attendance Tracker', ko: '보스 출석 트래커' },
  'admin.rosterSection': { en: 'Guild Roster', ko: '길드 로스터' },
  'admin.rosterOverview': { en: 'Overview', ko: '개요' },
  'admin.dashboard': { en: 'Dashboard', ko: '대시보드' },
  'admin.attendance': { en: 'Attendance', ko: '출석' },
  'admin.bossConfig': { en: 'Boss Config', ko: '보스 설정' },
  'admin.sheetTabs': { en: 'Sheet tabs', ko: '시트 탭' },
  'admin.signedInAs': { en: 'Signed in as {user}', ko: '로그인: {user}' },
  'admin.bossTitle': { en: 'Boss Attendance', ko: '보스 출석' },
  'admin.searchPh': { en: 'Search IGN…', ko: 'IGN 검색…' },
  'admin.allColumns': { en: 'All columns', ko: '전체 열' },
  'admin.allValues': { en: 'All values', ko: '전체 값' },
  'admin.filterBy': { en: 'Filter by {col}', ko: '{col}로 필터' },
  'admin.clear': { en: 'Clear', ko: '초기화' },
  'admin.addRow': { en: 'Add row', ko: '행 추가' },
  'admin.memberRows': { en: '{a} member rows', ko: '멤버 행 {a}' },
  'admin.memberRowsOf': { en: '{a} of {b} member rows', ko: '멤버 행 {a}/{b}' },
  'admin.columnsCount': { en: '{a} columns', ko: '{a}열' },
  'admin.showingCols': { en: 'showing {a} of {b} columns', ko: '{b}열 중 {a}열 표시' },
  'admin.editHint': {
    en: 'Click any cell to edit · changes save to the sheet instantly',
    ko: '셀을 클릭해 편집하세요 · 변경 사항이 시트에 즉시 저장됩니다',
  },
  'admin.noRows': { en: 'No rows match your filters.', ko: '필터 조건에 맞는 행이 없습니다.' },
  'admin.addRowDesc': {
    en: 'The first column (IGN) is required and must be unique. Leave the rest empty to fill in later.',
    ko: '첫 번째 열(IGN)은 필수이며 고유해야 합니다. 나머지는 비워두고 나중에 채울 수 있습니다.',
  },
  'admin.deleteRowTitle': { en: 'Delete row {n}?', ko: '{n}행을 삭제할까요?' },
  'admin.deleteRow': { en: 'Delete row', ko: '행 삭제' },
  'admin.deleteRowDesc': {
    en: 'This removes the row from “{title}” in the Google Sheet. This cannot be undone.',
    ko: '"{title}" 시트에서 해당 행을 삭제합니다. 이 작업은 되돌릴 수 없습니다.',
  },
  'admin.settingsTitle': { en: 'Admin settings', ko: '관리자 설정' },
  'admin.settingsDesc': {
    en: 'Change the admin password. It is stored (hashed) in the hidden credentials tab of the spreadsheet.',
    ko: '관리자 비밀번호를 변경합니다. 비밀번호는 스프레드시트의 숨겨진 자격 증명 탭에 해시되어 저장됩니다.',
  },
  'admin.currentAdminPassword': { en: 'Current admin password', ko: '현재 관리자 비밀번호' },
  'admin.passwordUpdated': { en: 'Admin password updated', ko: '관리자 비밀번호가 변경되었습니다' },
  'admin.couldNotSaveCell': { en: 'Could not save the cell', ko: '셀을 저장할 수 없습니다' },
  'admin.addedRow': { en: 'Added {ign} to {title}', ko: '{title}에 {ign} 추가됨' },
  'admin.couldNotAddRow': { en: 'Could not add the row', ko: '행을 추가할 수 없습니다' },
  'admin.rowDeleted': { en: 'Row deleted', ko: '행이 삭제되었습니다' },
  'admin.couldNotDeleteRow': { en: 'Could not delete the row', ko: '행을 삭제할 수 없습니다' },

  // ---- member ----
  'member.tag': { en: 'Member', ko: '멤버' },
  'member.myProfile': { en: 'My profile', ko: '내 프로필' },
  'member.profile': { en: 'Profile', ko: '프로필' },
  'member.loading': { en: 'Loading…', ko: '로딩 중…' },
  'member.badgeMember': { en: 'Member', ko: '멤버' },
  'member.notOnRoster': {
    en: 'Not on the roster yet — ask an admin to add you',
    ko: '아직 로스터에 없습니다 — 관리자에게 추가를 요청하세요',
  },
  'member.noRowProfile': {
    en: 'You don’t have a row in your profile yet. An admin can add you.',
    ko: '프로필에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.',
  },
  'member.noRowTab': {
    en: 'You don’t have a row in this tab yet. An admin can add you.',
    ko: '이 탭에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.',
  },
  'member.adminManaged': {
    en: 'Managed by an admin — members cannot change this',
    ko: '관리자 관리 항목 — 멤버는 변경할 수 없습니다',
  },
  'member.settingsTitle': { en: 'Profile settings', ko: '프로필 설정' },
  'member.settingsDesc': {
    en: 'Change your password. Your initial password is your IGN.',
    ko: '비밀번호를 변경합니다. 초기 비밀번호는 IGN입니다.',
  },
  'member.currentPassword': { en: 'Current password', ko: '현재 비밀번호' },
  'member.passwordUpdated': { en: 'Password updated', ko: '비밀번호가 변경되었습니다' },
  'member.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다' },

  // ---- collection cell ----
  'cell.mark': { en: 'Click to mark', ko: '클릭하여 표시' },
  'cell.clear': { en: 'Click to clear', ko: '클릭하여 해제' },
  'cell.edit': { en: 'Click to edit', ko: '클릭하여 편집' },

  // ---- guild roster ----
  'roster.members': { en: 'Members', ko: '멤버' },
  'roster.totalCp': { en: 'Total CP', ko: '총 CP' },
  'roster.avgCp': { en: 'Average CP', ko: '평균 CP' },
  'roster.topCp': { en: 'Top CP', ko: '최고 CP' },
  'roster.distTitle': { en: 'Combat Power Distribution', ko: '전투력 분포' },
  'roster.noCp': { en: 'No CP recorded yet.', ko: '아직 기록된 CP가 없습니다.' },
  'roster.bracket0': { en: '< 100K', ko: '< 100K' },
  'roster.bracket1': { en: '100K – 125K', ko: '100K – 125K' },
  'roster.bracket2': { en: '125K – 150K', ko: '125K – 150K' },
  'roster.bracket3': { en: '150K – 175K', ko: '150K – 175K' },
  'roster.bracket4': { en: '175K – 200K', ko: '175K – 200K' },
  'roster.bracket5': { en: '≥ 200K', ko: '≥ 200K' },
  'roster.topMeta': { en: 'TOP 10 CP', ko: 'TOP 10 CP' },
  'roster.cp': { en: 'CP', ko: 'CP' },
  'roster.mainWeapon': { en: 'Main weapon', ko: '메인 무기' },
  'roster.role': { en: 'Role', ko: '역할' },
  'roster.status': { en: 'Status', ko: '상태' },
  'roster.summaryMeta': {
    en: '{n} of {m} filled',
    ko: '{m}행 중 {n}행 기입',
  },
  'roster.noData': {
    en: 'No data recorded yet.',
    ko: '아직 기록된 데이터가 없습니다.',
  },

  // ---- boss tracker ----
  'boss.seeding': { en: 'Seeding the boss list…', ko: '보스 목록 생성 중…' },
  'boss.noBosses': { en: 'No bosses configured yet.', ko: '아직 설정된 보스가 없습니다.' },
  'boss.seed': { en: 'Seed bosses', ko: '보스 목록 생성' },
  'boss.seedErr': { en: 'Could not seed', ko: '보스 목록을 생성할 수 없습니다' },
  'boss.meta': {
    en: 'bosses · set the point value awarded per attendance',
    ko: '보스 · 출석 시 지급할 포인트 값을 설정하세요',
  },
  'boss.changesInstant': { en: 'Changes save to the sheet instantly', ko: '변경 사항이 시트에 즉시 저장됩니다' },
  'boss.boss': { en: 'Boss', ko: '보스' },
  'boss.level': { en: 'Level', ko: '레벨' },
  'boss.respawn': { en: 'Respawn', ko: '리젠' },
  'boss.points': { en: 'Points', ko: '포인트' },
  'boss.recordTitle': { en: 'Record attendance', ko: '출석 기록' },
  'boss.selected': { en: 'selected', ko: '명 선택' },
  'boss.ptsTotal': { en: 'pts total', ko: '포인트 합계' },
  'boss.filterMembers': { en: 'Filter members…', ko: '멤버 검색…' },
  'boss.selectAll': { en: 'Select all', ko: '전체 선택' },
  'boss.clear': { en: 'Clear', ko: '해제' },
  'boss.scan': { en: 'Scan party screenshot', ko: '파티 스크린샷 스캔' },
  'boss.scanning': { en: 'Reading screenshots…', ko: '스크린샷 읽는 중…' },
  'boss.scanDone': { en: '{n} members selected from screenshots', ko: '스크린샷에서 {n}명 선택됨' },
  'boss.scanNone': {
    en: 'No roster members found in the screenshots.',
    ko: '스크린샷에서 길드 멤버를 찾지 못했습니다.',
  },
  'boss.record': { en: 'Record attendance', ko: '출석 기록하기' },
  'boss.recordedToast': {
    en: 'Recorded {n} members (+{pts} pts each)',
    ko: '{n}명의 출석을 기록했습니다 (+{pts}점씩)',
  },
  'boss.noMembersMatch': { en: 'No members match.', ko: '일치하는 멤버가 없습니다.' },
  'boss.totalAwarded': { en: 'Total points awarded', ko: '지급된 총 포인트' },
  'boss.membersWithPoints': { en: 'Members with points', ko: '포인트 보유 멤버' },
  'boss.bossesTracked': { en: 'Bosses tracked', ko: '추적 중인 보스' },
  'boss.membersOnBoard': { en: 'members on the board', ko: '명이 순위표에 있습니다' },
  'boss.top30': { en: 'Top 30%', ko: '상위 30%' },
  'boss.top30Meta': {
    en: '{n} in the top 30% band (≥ {threshold} pts)',
    ko: '상위 30% 이내 {n}명 (≥ {threshold}점)',
  },
  'boss.noAttendance': { en: 'No attendance recorded yet.', ko: '아직 기록된 출석이 없습니다.' },
  'boss.added': { en: 'Added {name}', ko: '{name} 추가됨' },
  'boss.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다' },
  'boss.couldNotRecord': { en: 'Could not record attendance', ko: '출석을 기록할 수 없습니다' },
  'boss.pt': { en: 'pt', ko: '점' },
  'boss.pts': { en: 'pts', ko: '점' },
  'boss.weekly': { en: 'Weekly', ko: '주간' },

  // ---- admin tools / distribution ----
  'tools.section': { en: 'ADMIN TOOLS', ko: '관리자 도구' },
  'tools.distribution': { en: 'Boss attendance distribution', ko: '보스 출석 분배' },
  'tools.distTitle': { en: 'Boss Attendance Distribution', ko: '보스 출석 분배' },
  'tools.band': { en: 'Top 30% contributors', ko: '상위 30% 기여자' },
  'tools.pool': { en: 'Diamond pool', ko: '다이아몬드 풀' },
  'tools.save': { en: 'Save', ko: '저장' },
  'tools.savedNote': { en: 'Saved to DISTRIBUTION HISTORY', ko: 'DISTRIBUTION HISTORY에 저장됨' },
  'tools.distributedOn': { en: 'Distributed on', ko: '분배일' },
  'tools.points': { en: 'Points', ko: '포인트' },
  'tools.diamonds': { en: 'Diamonds', ko: '다이아몬드' },
  'tools.totalBand': { en: 'Total band points', ko: '밴드 총 포인트' },
  'tools.members': { en: 'members', ko: '명' },
  'tools.empty': {
    en: 'No attendance points recorded yet.',
    ko: '아직 기록된 출석 포인트가 없습니다.',
  },
  'tools.couldNot': { en: 'Could not distribute', ko: '분배를 완료할 수 없습니다' },
  'tools.confirmTitle': { en: 'Distribute diamonds?', ko: '다이아몬드를 분배할까요?' },
  'tools.confirmHint': {
    en: 'This will save the distribution and reset the current attendance points.',
    ko: '분배 내용을 저장하고 현재 출석 포인트를 초기화합니다.',
  },
  'tools.ok': { en: 'OK', ko: '확인' },

  // ---- admin tools / CP update ----
  'tools.cpUpdate': { en: 'CP Update', ko: 'CP 업데이트' },
  'tools.cpLeft': { en: 'Current CP', ko: '현재 CP' },
  'tools.cpRight': { en: 'Screenshot', ko: '스크린샷' },
  'tools.cpUpload': { en: 'Upload', ko: '업로드' },
  'tools.cpNoImage': {
    en: 'Upload a screenshot to auto-read IGN and CP.',
    ko: '스크린샷을 업로드하면 IGN과 CP를 자동으로 읽습니다.',
  },
  'tools.cpMatched': { en: 'Matched', ko: '일치' },
  'tools.cpUnmatched': { en: 'Unmatched', ko: '불일치' },
  'tools.cpReading': { en: 'Reading screenshot…', ko: '스크린샷 읽는 중…' },
  'tools.cpCouldNotRead': { en: 'Could not read the screenshot', ko: '스크린샷을 읽을 수 없습니다' },
  'tools.cpSomeFailed': { en: '{n} screenshot(s) failed to read', ko: '스크린샷 {n}개를 읽지 못했습니다' },
  'tools.cpCouldNotSave': { en: 'Could not update CP', ko: 'CP를 업데이트할 수 없습니다' },
  'tools.cpConfirmTitle': { en: 'Update CP?', ko: 'CP를 업데이트할까요?' },
  'tools.cpConfirmHint': {
    en: 'This will update each member\'s CP in BASIC INFORMATION and record it in CP HISTORY.',
    ko: '각 멤버의 CP를 BASIC INFORMATION에 업데이트하고 CP HISTORY에 기록합니다.',
  },
  'tools.cpSaved': { en: 'Saved to CP HISTORY', ko: 'CP HISTORY에 저장됨' },
  'tools.cpManualEdit': { en: 'Edit CP', ko: 'CP 편집' },
  'tools.cpManualLabel': { en: 'New CP', ko: '새 CP' },
  'tools.cpManualHint': {
    en: "Saves to BASIC INFORMATION and records today's date in CP HISTORY.",
    ko: 'BASIC INFORMATION에 저장하고 CP HISTORY에 오늘 날짜로 기록합니다.',
  },

  // ---- password modal ----
  'pw.newPassword': { en: 'New password', ko: '새 비밀번호' },
  'pw.confirmNew': { en: 'Confirm new password', ko: '새 비밀번호 확인' },
  'pw.update': { en: 'Update password', ko: '비밀번호 변경' },
  'pw.mismatch': { en: 'New passwords do not match', ko: '새 비밀번호가 일치하지 않습니다' },
  'pw.tooShort': { en: 'New password must be at least 6 characters', ko: '새 비밀번호는 6자 이상이어야 합니다' },
  'pw.couldNot': { en: 'Could not change password', ko: '비밀번호를 변경할 수 없습니다' },
};

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s = entry ? (lang === 'ko' ? entry.ko : entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

export function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'ko' ? 'ko' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  children: ReactNode;
}) {
  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm lang-toggle"
      title="Language / 언어"
      onClick={() => setLang(lang === 'en' ? 'ko' : 'en')}
    >
      {lang === 'en' ? '한국어' : 'English'}
    </button>
  );
}
