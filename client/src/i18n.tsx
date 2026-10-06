import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ko' | 'ja';

const LANG_KEY = 'astra.lang';

const DICT: Record<string, { en: string; ko: string; ja: string }> = {
  // ---- app ----
  'app.connectionLost': { en: 'connection lost', ko: '연결 끊김', ja: "接続が切断されました" },
  'app.waiting': { en: 'waiting for data…', ko: '데이터 대기 중…', ja: "データを待機中…" },
  'app.live': { en: 'live', ko: '실시간', ja: "ライブ" },
  'app.sheetUpdated': { en: 'Sheet updated — view refreshed', ko: '시트가 업데이트되어 화면을 새로고침했습니다', ja: "シートが更新されました — 画面を再読み込みしました" },
  'app.connectionProblem': { en: 'Connection problem', ko: '연결 문제', ja: "接続の問題" },
  'app.retry': { en: 'Retry', ko: '다시 시도', ja: "再試行" },
  'app.loadingData': { en: 'Loading guild data…', ko: '길드 데이터 로딩 중…', ja: "ギルドデータを読み込み中…" },
  'app.noTabs': { en: 'No tabs found', ko: '탭을 찾을 수 없습니다', ja: "タブが見つかりません" },
  'app.noTabsDesc': {
    en: 'The spreadsheet has no visible tabs, or the service account lost access.',
    ko: '스프레드시트에 표시되는 탭이 없거나 서비스 계정 접근 권한이 상실되었습니다.', ja: "スプレッドシートに表示可能なタブがないか、サービスアカウントのアクセス権が失われています。",
  },

  // ---- common ----
  'common.signOut': { en: 'Sign out', ko: '로그아웃', ja: "ログアウト" },
  'common.settings': { en: 'Settings', ko: '설정', ja: "設定" },
  'common.cancel': { en: 'Cancel', ko: '취소', ja: "キャンセル" },
  'common.saving': { en: 'Saving…', ko: '저장 중…', ja: "保存中…" },
  'common.saved': { en: 'Saved', ko: '저장됨', ja: "保存済み" },
  'common.failed': { en: 'Failed', ko: '실패', ja: "失敗" },
  'common.menu': { en: 'Menu', ko: '메뉴', ja: "メニュー" },
  'common.close': { en: 'Close', ko: '닫기', ja: "閉じる" },

  // ---- login ----
  'login.tag': { en: 'Guild Manager', ko: '길드 관리자', ja: "ギルドマネージャー" },
  'login.welcome': { en: 'Welcome back', ko: '다시 오신 것을 환영합니다', ja: "おかえりなさい" },
  'login.sub': {
    en: 'Sign in to manage the guild roster and your profile.',
    ko: '길드 로스터와 프로필을 관리하려면 로그인하세요.', ja: "ギルドロスターとプロフィールを管理するにはログインしてください。",
  },
  'login.username': { en: 'Username', ko: '아이디', ja: "ユーザー名" },
  'login.usernamePh': { en: 'admin or your IGN', ko: 'admin 또는 IGN', ja: "admin または IGN" },
  'login.password': { en: 'Password', ko: '비밀번호', ja: "パスワード" },
  'login.signIn': { en: 'Sign in', ko: '로그인', ja: "ログイン" },
  'login.members': { en: 'Members', ko: '멤버', ja: "メンバー" },
  'login.hint': {
    en: 'your username and initial password are both your IGN. You can change your password from your profile settings after signing in.',
    ko: '아이디와 초기 비밀번호는 모두 IGN입니다. 로그인 후 프로필 설정에서 비밀번호를 변경할 수 있습니다.', ja: "ユーザー名と初期パスワードはどちらもIGNです。ログイン後、プロフィール設定からパスワードを変更できます。",
  },
  'login.failed': { en: 'Login failed', ko: '로그인에 실패했습니다', ja: "ログインに失敗しました" },

  // ---- admin ----
  'admin.trackerSection': { en: 'Boss Attendance Tracker', ko: '보스 출석 트래커', ja: "ボス出席トラッカー" },
  'admin.rosterSection': { en: 'Guild Roster', ko: '길드 로스터', ja: "ギルドロスター" },
  'admin.rosterOverview': { en: 'Overview', ko: '개요', ja: "概要" },
  'admin.dashboard': { en: 'Dashboard', ko: '대시보드', ja: "ダッシュボード" },
  'admin.attendance': { en: 'Attendance', ko: '출석', ja: "出席" },
  'admin.bossConfig': { en: 'Boss Config', ko: '보스 설정', ja: "ボス設定" },
  'admin.sheetTabs': { en: 'Sheet tabs', ko: '시트 탭', ja: "シートタブ" },
  'admin.signedInAs': { en: 'Signed in as {user}', ko: '로그인: {user}', ja: "ログイン中: {user}" },
  'admin.bossTitle': { en: 'Boss Attendance', ko: '보스 출석', ja: "ボス出席" },
  'admin.searchPh': { en: 'Search IGN…', ko: 'IGN 검색…', ja: "IGNを検索…" },
  'admin.allColumns': { en: 'All columns', ko: '전체 열', ja: "すべての列" },
  'admin.allValues': { en: 'All values', ko: '전체 값', ja: "すべての値" },
  'admin.filterBy': { en: 'Filter by {col}', ko: '{col}로 필터', ja: "{col} で絞り込み" },
  'admin.clear': { en: 'Clear', ko: '초기화', ja: "クリア" },
  'admin.addRow': { en: 'Add row', ko: '행 추가', ja: "行を追加" },
  'admin.memberRows': { en: '{a} member rows', ko: '멤버 행 {a}', ja: "メンバー行 {a}" },
  'admin.memberRowsOf': { en: '{a} of {b} member rows', ko: '멤버 행 {a}/{b}', ja: "メンバー行 {a}/{b}" },
  'admin.columnsCount': { en: '{a} columns', ko: '{a}열', ja: "{a} 列" },
  'admin.showingCols': { en: 'showing {a} of {b} columns', ko: '{b}열 중 {a}열 표시', ja: "{b} 列中 {a} 列を表示" },
  'admin.editHint': {
    en: 'Click any cell to edit · changes save to the sheet instantly',
    ko: '셀을 클릭해 편집하세요 · 변경 사항이 시트에 즉시 저장됩니다', ja: "セルをクリックして編集 · 変更はシートに即時保存されます",
  },
  'admin.tip': { en: 'TIP', ko: '팁', ja: "ヒント" },
  'admin.tipTitle': { en: 'Roles & Status Guide', ko: '역할 · 상태 가이드', ja: "役割・ステータスガイド" },
  'admin.tipStatus': { en: 'Status', ko: '상태', ja: "ステータス" },
  'admin.tipRoles': { en: 'Roles', ko: '역할', ja: "役割" },
  'admin.tipClose': { en: 'Close', ko: '닫기', ja: "閉じる" },
  'admin.tipStCore': {
    en: '≥30% attendance + High CP (150k+).',
    ko: '출석 30% 이상 + 높은 CP (15만 이상).', ja: "出席30%以上 + 高CP (15万以上)。",
  },
  'admin.tipStActive': {
    en: '≥30% attendance. Regular participant.',
    ko: '출석 30% 이상. 정기 참여자.', ja: "出席30%以上。常連参加者。",
  },
  'admin.tipStBusy': {
    en: 'Dropped below 30% directly from Core or Active.',
    ko: 'Core 또는 Active에서 바로 30% 미만으로 하락.', ja: "Core または Active から直接30%未満に低下。",
  },
  'admin.tipStReserve': {
    en: '<30% attendance. No track record, or unexplained low attendance over time.',
    ko: '출석 30% 미만. 이력이 없거나, 기간 내내 설명되지 않는 저조한 출석.', ja: "出席30%未満。実績がない、または長期間にわたり説明不明の低い出席。",
  },
  'admin.tipStProbation': {
    en: 'New member (2–3 weeks observation).',
    ko: '신규 멤버 (2–3주 관찰 기간).', ja: "新メンバー（2〜3週間の観察期間）。",
  },
  'admin.tipStPending': {
    en: 'Discord approved; waiting for in-game application.',
    ko: '디스코드 승인 완료; 인게임 신청 대기 중.', ja: "Discord承認済み；ゲーム内申請を待機中。",
  },
  'admin.tipStInactive': {
    en: 'Absent without notice (14+ consecutive days).',
    ko: '통보 없이 부재 (14일 이상 연속).', ja: "無断欠席（14日以上連続）。",
  },
  'admin.tipRoleLeader': { en: 'Final decision-making authority.', ko: '최종 결정권을 가짐.', ja: "最終決定権を持つ。" },
  'admin.tipRoleCoLeader': {
    en: 'Leads alongside the Guild Leader and supports guild oversight.',
    ko: '길드 리더와 함께 이끌며 길드 감독을 지원.', ja: "ギルドリーダーと共に指導し、ギルドの監督を支援する。",
  },
  'admin.tipRoleOfficer': {
    en: 'Works directly with the Guild Leader and Co-Leader on guild planning and coordination. Is kept informed of guild plans first.',
    ko: '길드 리더 및 Co-Leader와 직접 함께 길드 계획과 조율을 담당하며, 길드 계획을 가장 먼저 공유받음.', ja: "ギルドリーダーおよびCo-Leaderと直接協力し、ギルド計画と調整を担当。ギルド計画を最初に共有される。",
  },
  'admin.tipRoleSupport': {
    en: 'Helps with Discord tasks and member concerns. May lead battles or parties when leaders and Officers are unavailable.',
    ko: '디스코드 업무와 멤버 문의를 돕습니다. 리더와 Officer이 부재 시 배틀이나 파티를 이끌 수 있음.', ja: "Discordの業務とメンバーの相談を支援。リーダーやOfficerが不在の際はバトルやパーティを率いることができる。",
  },
  'admin.tipRoleSenior': {
    en: 'Leader-appointed for proven reliability, consistent contribution, and clear communication. A respected voice.',
    ko: '리더가 임명. 입증된 신뢰성, 꾸준한 기여, 명확한 소통. 존중받는 목소리.', ja: "リーダーが任命。証明された信頼性、一貫した貢献、明確なコミュニケーション。尊敬される声。",
  },
  'admin.tipRoleMember': {
    en: 'Standard member role. Everyone starts here.',
    ko: '표준 멤버 직책. 모든 멤버는 여기서 시작합니다.', ja: "標準のメンバー役職。すべてのメンバーはここから始まる。",
  },
  'admin.noRows': { en: 'No rows match your filters.', ko: '필터 조건에 맞는 행이 없습니다.', ja: "フィルターに一致する行がありません。" },
  'admin.addRowDesc': {
    en: 'The first column (IGN) is required and must be unique. Leave the rest empty to fill in later.',
    ko: '첫 번째 열(IGN)은 필수이며 고유해야 합니다. 나머지는 비워두고 나중에 채울 수 있습니다.', ja: "1列目（IGN）は必須で一意である必要があります。残りは空欄にして後で入力できます。",
  },
  'admin.deleteRowTitle': { en: 'Delete row {n}?', ko: '{n}행을 삭제할까요?', ja: "{n}行を削除しますか？" },
  'admin.deleteRow': { en: 'Delete row', ko: '행 삭제', ja: "行を削除" },
  'admin.deleteRowDesc': {
    en: 'This removes the row from “{title}” in the Google Sheet. This cannot be undone.',
    ko: '"{title}" 시트에서 해당 행을 삭제합니다. 이 작업은 되돌릴 수 없습니다.', ja: "Googleシートの「{title}」からこの行を削除します。元に戻せません。",
  },
  'admin.settingsTitle': { en: 'Admin settings', ko: '관리자 설정', ja: "管理者設定" },
  'admin.settingsDesc': {
    en: 'Change the admin password. It is stored (hashed) in the hidden credentials tab of the spreadsheet.',
    ko: '관리자 비밀번호를 변경합니다. 비밀번호는 스프레드시트의 숨겨진 자격 증명 탭에 해시되어 저장됩니다.', ja: "管理者パスワードを変更します。パスワードはスプレッドシートの非表示資格情報タブに（ハッシュして）保存されます。",
  },
  'admin.currentAdminPassword': { en: 'Current admin password', ko: '현재 관리자 비밀번호', ja: "現在の管理者パスワード" },
  'admin.passwordUpdated': { en: 'Admin password updated', ko: '관리자 비밀번호가 변경되었습니다', ja: "管理者パスワードを更新しました" },
  'admin.couldNotSaveCell': { en: 'Could not save the cell', ko: '셀을 저장할 수 없습니다', ja: "セルを保存できませんでした" },
  'admin.addedRow': { en: 'Added {ign} to {title}', ko: '{title}에 {ign} 추가됨', ja: "{title}に{ign}を追加しました" },
  'admin.couldNotAddRow': { en: 'Could not add the row', ko: '행을 추가할 수 없습니다', ja: "行を追加できませんでした" },
  'admin.rowDeleted': { en: 'Row deleted', ko: '행이 삭제되었습니다', ja: "行を削除しました" },
  'admin.couldNotDeleteRow': { en: 'Could not delete the row', ko: '행을 삭제할 수 없습니다', ja: "行を削除できませんでした" },

  // ---- member ----
  'member.tag': { en: 'Member', ko: '멤버', ja: "メンバー" },
  'member.myProfile': { en: 'My profile', ko: '내 프로필', ja: "自分のプロフィール" },
  'member.profile': { en: 'Profile', ko: '프로필', ja: "プロフィール" },
  'member.loading': { en: 'Loading…', ko: '로딩 중…', ja: "読み込み中…" },
  'member.badgeMember': { en: 'Member', ko: '멤버', ja: "メンバー" },
  'member.notOnRoster': {
    en: 'Not on the roster yet — ask an admin to add you',
    ko: '아직 로스터에 없습니다 — 관리자에게 추가를 요청하세요', ja: "まだロスターにいません — 管理者に追加を依頼してください",
  },
  'member.noRowProfile': {
    en: 'You don’t have a row in your profile yet. An admin can add you.',
    ko: '프로필에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.', ja: "まだプロフィールに行がありません。管理者が追加できます。",
  },
  'member.noRowTab': {
    en: 'You don’t have a row in this tab yet. An admin can add you.',
    ko: '이 탭에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.', ja: "このタブにまだ行がありません。管理者が追加できます。",
  },
  'member.adminManaged': {
    en: 'Managed by an admin — members cannot change this',
    ko: '관리자 관리 항목 — 멤버는 변경할 수 없습니다', ja: "管理者による管理項目 — メンバーは変更できません",
  },
  'member.settingsTitle': { en: 'Profile settings', ko: '프로필 설정', ja: "プロフィール設定" },
  'member.settingsDesc': {
    en: 'Change your password. Your initial password is your IGN.',
    ko: '비밀번호를 변경합니다. 초기 비밀번호는 IGN입니다.', ja: "パスワードを変更します。初期パスワードはIGNです。",
  },
  'member.currentPassword': { en: 'Current password', ko: '현재 비밀번호', ja: "現在のパスワード" },
  'member.passwordUpdated': { en: 'Password updated', ko: '비밀번호가 변경되었습니다', ja: "パスワードを更新しました" },
  'member.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다', ja: "保存できませんでした" },

  // ---- collection cell ----
  'cell.mark': { en: 'Click to mark', ko: '클릭하여 표시', ja: "クリックして記録" },
  'cell.clear': { en: 'Click to clear', ko: '클릭하여 해제', ja: "クリックしてクリア" },
  'cell.edit': { en: 'Click to edit', ko: '클릭하여 편집', ja: "クリックして編集" },

  // ---- guild roster ----
  'roster.members': { en: 'Members', ko: '멤버', ja: "メンバー" },
  'roster.totalCp': { en: 'Total CP', ko: '총 CP', ja: "合計CP" },
  'roster.avgCp': { en: 'Average CP', ko: '평균 CP', ja: "平均CP" },
  'roster.topCp': { en: 'Top CP', ko: '최고 CP', ja: "最高CP" },
  'roster.distTitle': { en: 'Combat Power Distribution', ko: '전투력 분포', ja: "戦闘力分布" },
  'roster.noCp': { en: 'No CP recorded yet.', ko: '아직 기록된 CP가 없습니다.', ja: "まだCPが記録されていません。" },
  'roster.bracket0': { en: '< 100K', ko: '< 100K', ja: "< 100K" },
  'roster.bracket1': { en: '100K – 125K', ko: '100K – 125K', ja: "100K – 125K" },
  'roster.bracket2': { en: '125K – 150K', ko: '125K – 150K', ja: "125K – 150K" },
  'roster.bracket3': { en: '150K – 175K', ko: '150K – 175K', ja: "150K – 175K" },
  'roster.bracket4': { en: '175K – 200K', ko: '175K – 200K', ja: "175K – 200K" },
  'roster.bracket5': { en: '≥ 200K', ko: '≥ 200K', ja: "≥ 200K" },
  'roster.topMeta': { en: 'TOP 10 CP', ko: 'TOP 10 CP', ja: "TOP 10 CP" },
  'roster.cp': { en: 'CP', ko: 'CP', ja: "CP" },
  'roster.mainWeapon': { en: 'Main Weapon', ko: '메인 무기', ja: "メイン武器" },
  'roster.role': { en: 'Role', ko: '역할', ja: "役割" },
  'roster.status': { en: 'Status', ko: '상태', ja: "ステータス" },
  'roster.summaryMeta': {
    en: '{n} of {m} filled',
    ko: '{m}행 중 {n}행 기입', ja: "{m}行中 {n}行入力済み",
  },
  'roster.noData': {
    en: 'No data recorded yet.',
    ko: '아직 기록된 데이터가 없습니다.', ja: "まだデータが記録されていません。",
  },

  // ---- boss tracker ----
  'boss.seeding': { en: 'Seeding the boss list…', ko: '보스 목록 생성 중…', ja: "ボスリストを作成中…" },
  'boss.noBosses': { en: 'No bosses configured yet.', ko: '아직 설정된 보스가 없습니다.', ja: "まだボスが設定されていません。" },
  'boss.seed': { en: 'Seed bosses', ko: '보스 목록 생성', ja: "ボスを作成" },
  'boss.seedErr': { en: 'Could not seed', ko: '보스 목록을 생성할 수 없습니다', ja: "作成できませんでした" },
  'boss.meta': {
    en: 'bosses · set the point value awarded per attendance',
    ko: '보스 · 출석 시 지급할 포인트 값을 설정하세요', ja: "ボス · 出席時に付与するポイント値を設定してください",
  },
  'boss.changesInstant': { en: 'Changes save to the sheet instantly', ko: '변경 사항이 시트에 즉시 저장됩니다', ja: "変更はシートに即時保存されます" },
  'boss.boss': { en: 'Boss', ko: '보스', ja: "ボス" },
  'boss.level': { en: 'Level', ko: '레벨', ja: "レベル" },
  'boss.respawn': { en: 'Respawn', ko: '리젠', ja: "リスポーン" },
  'boss.points': { en: 'Points', ko: '포인트', ja: "ポイント" },
  'boss.recordTitle': { en: 'Record attendance', ko: '출석 기록', ja: "出席を記録" },
  'boss.selected': { en: 'selected', ko: '명 선택', ja: "選択中" },
  'boss.ptsTotal': { en: 'pts total', ko: '포인트 합계', ja: "ポイント合計" },
  'boss.filterMembers': { en: 'Filter members…', ko: '멤버 검색…', ja: "メンバーを絞り込み…" },
  'boss.selectAll': { en: 'Select all', ko: '전체 선택', ja: "すべて選択" },
  'boss.clear': { en: 'Clear', ko: '해제', ja: "クリア" },
  'boss.scan': { en: 'Scan party screenshot', ko: '파티 스크린샷 스캔', ja: "パーティースクリーンショットをスキャン" },
  'boss.scanning': { en: 'Reading screenshots…', ko: '스크린샷 읽는 중…', ja: "スクリーンショットを読み取り中…" },
  'boss.scanDone': { en: '{n} members selected from screenshots', ko: '스크린샷에서 {n}명 선택됨', ja: "スクリーンショットから {n}名を選択しました" },
  'boss.scanNone': {
    en: 'No roster members found in the screenshots.',
    ko: '스크린샷에서 길드 멤버를 찾지 못했습니다.', ja: "スクリーンショットからギルドメンバーが見つかりませんでした。",
  },
  'boss.record': { en: 'Record attendance', ko: '출석 기록하기', ja: "出席を記録" },
  'boss.recordedToast': {
    en: 'Recorded {n} members (+{pts} pts each)',
    ko: '{n}명의 출석을 기록했습니다 (+{pts}점씩)', ja: "{n}名の出席を記録しました（各 +{pts}pt）",
  },
  'boss.noMembersMatch': { en: 'No members match.', ko: '일치하는 멤버가 없습니다.', ja: "一致するメンバーがいません。" },
  'boss.totalAwarded': { en: 'Total points awarded', ko: '지급된 총 포인트', ja: "支給された合計ポイント" },
  'boss.membersWithPoints': { en: 'Members with points', ko: '포인트 보유 멤버', ja: "ポイント保有メンバー" },
  'boss.bossesTracked': { en: 'Bosses tracked', ko: '추적 중인 보스', ja: "追跡中のボス" },
  'boss.membersOnBoard': { en: 'members on the board', ko: '명이 순위표에 있습니다', ja: "名がランクボードにいます" },
  'boss.top30': { en: 'Top 30%', ko: '상위 30%', ja: "上位30%" },
  'boss.top30Meta': {
    en: '{n} in the top 30% band (≥ {threshold} pts)',
    ko: '상위 30% 이내 {n}명 (≥ {threshold}점)', ja: "上位30%バンドに {n}名（≥ {threshold}pt）",
  },
  'boss.noAttendance': { en: 'No attendance recorded yet.', ko: '아직 기록된 출석이 없습니다.', ja: "まだ出席が記録されていません。" },
  'boss.added': { en: 'Added {name}', ko: '{name} 추가됨', ja: "{name} を追加しました" },
  'boss.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다', ja: "保存できませんでした" },
  'boss.couldNotRecord': { en: 'Could not record attendance', ko: '출석을 기록할 수 없습니다', ja: "出席を記録できませんでした" },
  'boss.pt': { en: 'pt', ko: '점', ja: "pt" },
  'boss.pts': { en: 'pts', ko: '점', ja: "pt" },
  'boss.weekly': { en: 'Weekly', ko: '주간', ja: "週間" },

  // ---- admin tools / distribution ----
  'tools.section': { en: 'ADMIN TOOLS', ko: '관리자 도구', ja: "管理者ツール" },
  'tools.distribution': { en: 'Boss attendance distribution', ko: '보스 출석 분배', ja: "ボス出席分配" },
  'tools.distTitle': { en: 'Boss Attendance Distribution', ko: '보스 출석 분배', ja: "ボス出席分配" },
  'tools.band': { en: 'Top 30% contributors', ko: '상위 30% 기여자', ja: "上位30%貢献者" },
  'tools.pool': { en: 'Diamond pool', ko: '다이아몬드 풀', ja: "ダイヤモンドプール" },
  'tools.save': { en: 'Save', ko: '저장', ja: "保存" },
  'tools.savedNote': { en: 'Saved to {title}', ko: '{title}에 저장됨', ja: "{title}に保存済み" },
  'tools.distributedOn': { en: 'Distributed on', ko: '분배일', ja: "分配日" },
  'tools.points': { en: 'Points', ko: '포인트', ja: "ポイント" },
  'tools.diamonds': { en: 'Diamonds', ko: '다이아몬드', ja: "ダイヤモンド" },
  'tools.totalBand': { en: 'Total band points', ko: '밴드 총 포인트', ja: "バンド合計ポイント" },
  'tools.members': { en: 'members', ko: '명', ja: "名" },
  'tools.empty': {
    en: 'No attendance points recorded yet.',
    ko: '아직 기록된 출석 포인트가 없습니다.', ja: "まだ出席ポイントが記録されていません。",
  },
  'tools.couldNot': { en: 'Could not distribute', ko: '분배를 완료할 수 없습니다', ja: "分配を完了できませんでした" },
  'tools.confirmTitle': { en: 'Distribute diamonds?', ko: '다이아몬드를 분배할까요?', ja: "ダイヤモンドを分配しますか？" },
  'tools.confirmHint': {
    en: 'This will save the distribution and reset the current attendance points.',
    ko: '분배 내용을 저장하고 현재 출석 포인트를 초기화합니다.', ja: "分配を保存し、現在の出席ポイントをリセットします。",
  },
  'tools.ok': { en: 'OK', ko: '확인', ja: "OK" },

  // ---- admin tools / CP update ----
  'tools.cpUpdate': { en: 'CP Update', ko: 'CP 업데이트', ja: "CP更新" },
  'tools.cpLeft': { en: 'Current CP', ko: '현재 CP', ja: "現在のCP" },
  'tools.cpRight': { en: 'Screenshot', ko: '스크린샷', ja: "スクリーンショット" },
  'tools.cpUpload': { en: 'Upload', ko: '업로드', ja: "アップロード" },
  'tools.cpNoImage': {
    en: 'Upload a screenshot to auto-read IGN and CP.',
    ko: '스크린샷을 업로드하면 IGN과 CP를 자동으로 읽습니다.', ja: "スクリーンショットをアップロードするとIGNとCPを自動で読み取ります。",
  },
  'tools.cpMatched': { en: 'Matched', ko: '일치', ja: "一致" },
  'tools.cpUnmatched': { en: 'Unmatched', ko: '불일치', ja: "不一致" },
  'tools.cpReading': { en: 'Reading screenshot…', ko: '스크린샷 읽는 중…', ja: "スクリーンショットを読み取り中…" },
  'tools.cpCouldNotRead': { en: 'Could not read the screenshot', ko: '스크린샷을 읽을 수 없습니다', ja: "スクリーンショットを読み取れませんでした" },
  'tools.cpSomeFailed': { en: '{n} screenshot(s) failed to read', ko: '스크린샷 {n}개를 읽지 못했습니다', ja: "{n}枚のスクリーンショットの読み取りに失敗しました" },
  'tools.cpCouldNotSave': { en: 'Could not update CP', ko: 'CP를 업데이트할 수 없습니다', ja: "CPを更新できませんでした" },
  'tools.cpConfirmTitle': { en: 'Update CP?', ko: 'CP를 업데이트할까요?', ja: "CPを更新しますか？" },
  'tools.cpConfirmHint': {
    en: 'This will update each member\'s CP in {basic} and record it in {history}.',
    ko: '각 멤버의 CP를 {basic}에 업데이트하고 {history}에 기록합니다.', ja: "各メンバーのCPを{basic}に更新し、{history}に記録します。",
  },
  'tools.cpSaved': { en: 'Saved to {history}', ko: '{history}에 저장됨', ja: "{history}に保存済み" },
  'tools.cpManualEdit': { en: 'Edit CP', ko: 'CP 편집', ja: "CPを編集" },
  'tools.cpManualLabel': { en: 'New CP', ko: '새 CP', ja: "新しいCP" },
  'tools.cpManualHint': {
    en: 'Saves to {basic} and records today\'s date in {history}.',
    ko: '{basic}에 저장하고 {history}에 오늘 날짜로 기록합니다.', ja: "{basic}に保存し、今日の日付を{history}に記録します。",
  },

  // ---- password modal ----
  'pw.newPassword': { en: 'New password', ko: '새 비밀번호', ja: "新しいパスワード" },
  'pw.confirmNew': { en: 'Confirm new password', ko: '새 비밀번호 확인', ja: "新しいパスワード（確認）" },
  'pw.update': { en: 'Update password', ko: '비밀번호 변경', ja: "パスワードを更新" },
  'pw.mismatch': { en: 'New passwords do not match', ko: '새 비밀번호가 일치하지 않습니다', ja: "新しいパスワードが一致しません" },
  'pw.tooShort': { en: 'New password must be at least 6 characters', ko: '새 비밀번호는 6자 이상이어야 합니다', ja: "新しいパスワードは6文字以上にしてください" },
  'pw.couldNot': { en: 'Could not change password', ko: '비밀번호를 변경할 수 없습니다', ja: "パスワードを変更できませんでした" },

  // ---- sheet tab titles (display-only) ----
  'tab.basicInformation': { en: 'Basic Information', ko: '기본 정보', ja: "基本情報" },
  'tab.equipment': { en: 'Equipment', ko: '장비', ja: "装備" },
  'tab.bossCollection': { en: 'Boss Collection', ko: '보스 컬렉션', ja: "ボスコレクション" },
  'tab.successorCollection': { en: 'Successor Collection', ko: '계승자 컬렉션', ja: "継承者コレクション" },
  'tab.epicAccessoryCollection': { en: 'Epic +12 Accessory Collection', ko: '에픽 +12 액세서리 컬렉션', ja: "エピック+12アクセサリーコレクション" },
  'tab.cloakCollection': { en: 'Cloak Collection', ko: '망토 컬렉션', ja: "マントコレクション" },
  'tab.bossAttendance': { en: 'Boss Attendance', ko: '보스 출석', ja: "ボス出席" },
  'tab.bossConfig': { en: 'Boss Config', ko: '보스 설정', ja: "ボス設定" },
  'tab.distributionHistory': { en: 'Distribution History', ko: '분배 내역', ja: "分配履歴" },
  'tab.cpHistory': { en: 'CP History', ko: 'CP 기록', ja: "CP履歴" },

  // ---- sheet column headers (display-only) ----
  'col.nation': { en: 'Nation', ko: '국가', ja: "国" },
  'col.guild': { en: 'Guild', ko: '길드', ja: "ギルド" },
  'col.role': { en: 'Role', ko: '역할', ja: "役割" },
  'col.status': { en: 'Status', ko: '상태', ja: "ステータス" },
  'col.nickname': { en: 'Nickname', ko: '닉네임', ja: "ニックネーム" },
  'col.notes': { en: 'Notes', ko: '메모', ja: "メモ" },
  'col.mainWeapon': { en: 'Main Weapon', ko: '메인 무기', ja: "メイン武器" },
  'col.subWeapon': { en: 'Sub weapon', ko: '보조 무기', ja: "サブ武器" },
  'col.armor': { en: 'Armor', ko: '방어구', ja: "アーマー" },
  'col.necklace': { en: 'Necklace', ko: '목걸이', ja: "ネックレス" },
  'col.ring': { en: 'Ring', ko: '반지', ja: "リング" },
  'col.earring': { en: 'Earring', ko: '귀걸이', ja: "イヤリング" },
  'col.earrings': { en: 'Earrings', ko: '귀걸이', ja: "イヤリング" },
  'col.bracelet': { en: 'Bracelet', ko: '팔찌', ja: "ブレスレット" },
  'col.belt': { en: 'Belt', ko: '벨트', ja: "ベルト" },
  'col.legendaryCloak': { en: 'Legendary cloak', ko: '레전더리 망토', ja: "レジェンダリー・マント" },
  'col.points': { en: 'Points', ko: '포인트', ja: "ポイント" },
  'col.reward': { en: 'Reward', ko: '보상', ja: "報酬" },
  'col.boss': { en: 'Boss', ko: '보스', ja: "ボス" },
  'col.neck': { en: 'Neck', ko: '목', ja: "ネック" },
  'col.valor': { en: 'Valor', ko: '용맹', ja: "勇敢" },
  'col.accuracy': { en: 'Accuracy', ko: '명중', ja: "命中" },
  'col.penetration': { en: 'Penetration', ko: '관통', ja: "貫通" },
  'col.critical': { en: 'Critical', ko: '치명타', ja: "クリティカル" },
  'col.enchantment10': { en: 'ENCHANTMENT +10', ko: '인챈트 +10', ja: "エンチャント +10" },
  'col.oneOfEach0': { en: 'One of each type enchantment +0', ko: '종류별 1개 인챈트 +0', ja: "種類別1個 エンチャント +0" },
  'col.fivePiece0': { en: '5 pieces set enchantment +0', ko: '5개 세트 인챈트 +0', ja: "5点セット エンチャント +0" },
  'col.oneOfEach12': { en: 'One of each type enchantment +12', ko: '종류별 1개 인챈트 +12', ja: "種類別1個 エンチャント +12" },
  'col.goldBloodCloak3': { en: 'Gold Blood Cloak+3', ko: '골드 블러드 망토+3', ja: "ゴールドブラッド・マント+3" },
  'col.goldBloodCloak5': { en: 'Gold Blood Cloak+5', ko: '골드 블러드 망토+5', ja: "ゴールドブラッド・マント+5" },
  'col.darkOrhCloak3': { en: 'Dark Orh Cloak+3', ko: '다크 오르 망토+3', ja: "ダークオル・マント+3" },
  'col.darkOrhCloak5': { en: 'Dark Orh Cloak+5', ko: '다크 오르 망토+5', ja: "ダークオル・マント+5" },
  'col.successorCloak3': { en: "Successor's Cloak+3", ko: '계승자의 망토+3', ja: "継承者のマント+3" },
  'col.successorCloak5': { en: "Successor's Cloak+5", ko: '계승자의 망토+5', ja: "継承者のマント+5" },

  // ---- boss names (display-only; ko/ja from ASTRA-Boss-Timer) ----
  'boss.venatus': { en: 'Venatus', ko: '베나투스', ja: "ベナトゥス" },
  'boss.viorent': { en: 'Viorent', ko: '비오렌트', ja: "ビオレント" },
  'boss.ego': { en: 'Ego', ko: '에고', ja: "エゴ" },
  'boss.clemantis': { en: 'Clemantis', ko: '클레멘티스', ja: "クレメンティス" },
  'boss.livera': { en: 'Livera', ko: '리베라', ja: "リベラ" },
  'boss.araneo': { en: 'Araneo', ko: '아라네오', ja: "アラネオ" },
  'boss.undomiel': { en: 'Undomiel', ko: '언두미엘', ja: "アンドゥミエル" },
  'boss.saphirus': { en: 'Saphirus', ko: '사피루스', ja: "サピルス" },
  'boss.neutro': { en: 'Neutro', ko: '네우트로', ja: "ネウトロ" },
  'boss.ladyDalia': { en: 'Lady Dalia', ko: '레이디 달리아', ja: "レディ·ダリア" },
  'boss.generalAquleus': { en: 'General Aquleus', ko: '장군 아쿨레우스', ja: "将軍アクレウス" },
  'boss.aquleus': { en: 'Aquleus', ko: '아쿨레우스', ja: "アクレウス" },
  'boss.thymele': { en: 'Thymele', ko: '튀멜레', ja: "テュメレ" },
  'boss.amentis': { en: 'Amentis', ko: '아멘티스', ja: "アメンティス" },
  'boss.baronBraudmore': { en: 'Baron Braudmore', ko: '남작 브라우드모어', ja: "ブラウドモア" },
  'boss.braudmore': { en: 'Braudmore', ko: '브라우드모어', ja: "ブラウドモア" },
  'boss.milavy': { en: 'Milavy', ko: '밀라베', ja: "ミラベ" },
  'boss.wannitas': { en: 'Wannitas', ko: '와니타스', ja: "ワニタス" },
  'boss.metus': { en: 'Metus', ko: '메투스', ja: "メトゥス" },
  'boss.duplican': { en: 'Duplican', ko: '듀플리칸', ja: "デュプリカン" },
  'boss.shuliar': { en: 'Shuliar', ko: '슈라이어', ja: "シュライヤー" },
  'boss.ringor': { en: 'Ringor', ko: '링고르', ja: "リンゴル" },
  'boss.roderick': { en: 'Roderick', ko: '로데릭', ja: "ロデリック" },
  'boss.gareth': { en: 'Gareth', ko: '가레스', ja: "ガレス" },
  'boss.titore': { en: 'Titore', ko: '티토르', ja: "ティトル" },
  'boss.larba': { en: 'Larba', ko: '라르바', ja: "ラルバ" },
  'boss.catena': { en: 'Catena', ko: '카테나', ja: "カテナ" },
  'boss.auraq': { en: 'Auraq', ko: '아우라크', ja: "アウラーク" },
  'boss.secreta': { en: 'Secreta', ko: '세크레타', ja: "セクレタ" },
  'boss.ordo': { en: 'Ordo', ko: '오르도', ja: "オルド" },
  'boss.asta': { en: 'Asta', ko: '아스타', ja: "アスタ" },
  'boss.supore': { en: 'Supore', ko: '수포르', ja: "スポル" },
  'boss.chaiflock': { en: 'Chaiflock', ko: '샤이프락', ja: "シャイフロック" },
  'boss.benji': { en: 'Benji', ko: '벤지', ja: "ベンジー" },
  'boss.libitina': { en: 'Libitina', ko: '리비티나', ja: "リビティーナ" },
  'boss.rakajeth': { en: 'Rakajeth', ko: '라카제스', ja: "ラカゼス" },
  'boss.icaruthia': { en: 'Icaruthia', ko: '이카루시아', ja: "イカルシア" },
  'boss.motti': { en: 'Motti', ko: '모티', ja: "モティ" },
  'boss.camalia': { en: 'Camalia', ko: '카말리아', ja: "カマリア" },
  'boss.nevaeh': { en: 'Nevaeh', ko: '네바', ja: "ネバ" },
  'boss.tumier': { en: 'Tumier', ko: '투미어', ja: "トゥミエル" },
  'boss.lucus': { en: 'Lucus', ko: '루크스', ja: "ルクス" },
  'boss.azzamHissan': { en: 'Azzam Hissan', ko: '아잠 히산', ja: "アザム・ヒサン" },
  'boss.serad': { en: 'Serad', ko: '세라드', ja: "セラド" },
  'boss.serbis': { en: 'Serbis', ko: '세르비스', ja: "セルビス" },
  'boss.grayDawn': { en: 'Gray Dawn', ko: '그레이 던', ja: "グレイ・ドーン" },
  'boss.blackThorn': { en: 'Black Thorn', ko: '블랙 쏜', ja: "ブラック・ソーン" },
  'boss.elSera': { en: 'El Sera', ko: '엘 세라', ja: "エル・セラ" },
  'boss.kransia': { en: 'Kransia', ko: '크란시아', ja: "クランシア" },
};

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s = entry ? entry[lang] : key;
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
    const v = localStorage.getItem(LANG_KEY);
    return v === 'ko' || v === 'ja' ? v : 'en';
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
      title="Language / 언어 / 日本語"
      onClick={() => setLang(lang === 'en' ? 'ko' : lang === 'ko' ? 'ja' : 'en')}
    >
      {lang === 'en' ? '한국어' : lang === 'ko' ? '日本語' : 'English'}
    </button>
  );
}
