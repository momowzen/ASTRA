import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ko' | 'ja' | 'zh';

const LANG_KEY = 'astra.lang';

const DICT: Record<string, { en: string; ko: string; ja: string; zh: string }> = {
  // ---- app ----
  'app.connectionLost': { en: 'connection lost', ko: '연결 끊김', ja: "接続が切断されました", zh: '连接断开' },
  'app.waiting': { en: 'waiting for data…', ko: '데이터 대기 중…', ja: "データを待機中…", zh: '等待数据…' },
  'app.live': { en: 'live', ko: '실시간', ja: "ライブ", zh: '实时' },
  'app.sheetUpdated': { en: 'Sheet updated — view refreshed', ko: '시트가 업데이트되어 화면을 새로고침했습니다', ja: "シートが更新されました — 画面を再読み込みしました", zh: '表格已更新 — 视图已刷新' },
  'app.connectionProblem': { en: 'Connection problem', ko: '연결 문제', ja: "接続の問題", zh: '连接问题' },
  'app.retry': { en: 'Retry', ko: '다시 시도', ja: "再試行", zh: '重试' },
  'app.loadingData': { en: 'Loading guild data…', ko: '길드 데이터 로딩 중…', ja: "ギルドデータを読み込み中…", zh: '正在加载公会数据…' },
  'app.noTabs': { en: 'No tabs found', ko: '탭을 찾을 수 없습니다', ja: "タブが見つかりません", zh: '未找到标签页' },
  'app.noTabsDesc': {
    en: 'The spreadsheet has no visible tabs, or the service account lost access.',
    ko: '스프레드시트에 표시되는 탭이 없거나 서비스 계정 접근 권한이 상실되었습니다.', ja: "スプレッドシートに表示可能なタブがないか、サービスアカウントのアクセス権が失われています。",
    zh: '电子表格没有可见的标签页，或服务账号已失去访问权限。',
  },

  // ---- common ----
  'common.signOut': { en: 'Sign out', ko: '로그아웃', ja: "ログアウト", zh: '退出登录' },
  'common.settings': { en: 'Settings', ko: '설정', ja: "設定", zh: '设置' },
  'common.cancel': { en: 'Cancel', ko: '취소', ja: "キャンセル", zh: '取消' },
  'common.saving': { en: 'Saving…', ko: '저장 중…', ja: "保存中…", zh: '保存中…' },
  'common.saved': { en: 'Saved', ko: '저장됨', ja: "保存済み", zh: '已保存' },
  'common.failed': { en: 'Failed', ko: '실패', ja: "失敗", zh: '失败' },
  'common.menu': { en: 'Menu', ko: '메뉴', ja: "メニュー", zh: '菜单' },
  'common.close': { en: 'Close', ko: '닫기', ja: "閉じる", zh: '关闭' },

  // ---- login ----
  'login.tag': { en: 'Guild Manager', ko: '길드 관리자', ja: "ギルドマネージャー", zh: '公会管理' },
  'login.welcome': { en: 'Welcome back', ko: '다시 오신 것을 환영합니다', ja: "おかえりなさい", zh: '欢迎回来' },
  'login.sub': {
    en: 'Sign in to manage the guild roster and your profile.',
    ko: '길드 로스터와 프로필을 관리하려면 로그인하세요.', ja: "ギルドロスターとプロフィールを管理するにはログインしてください。",
    zh: '登录以管理公会名单和你的个人资料。',
  },
  'login.username': { en: 'Username', ko: '아이디', ja: "ユーザー名", zh: '用户名' },
  'login.usernamePh': { en: 'admin or your IGN', ko: 'admin 또는 IGN', ja: "admin または IGN", zh: 'admin 或你的 IGN' },
  'login.password': { en: 'Password', ko: '비밀번호', ja: "パスワード", zh: '密码' },
  'login.signIn': { en: 'Sign in', ko: '로그인', ja: "ログイン", zh: '登录' },
  'login.members': { en: 'Members', ko: '멤버', ja: "メンバー", zh: '成员' },
  'login.hint': {
    en: 'your username and initial password are both your IGN. You can change your password from your profile settings after signing in.',
    ko: '아이디와 초기 비밀번호는 모두 IGN입니다. 로그인 후 프로필 설정에서 비밀번호를 변경할 수 있습니다.', ja: "ユーザー名と初期パスワードはどちらもIGNです。ログイン後、プロフィール設定からパスワードを変更できます。",
    zh: '用户名和初始密码都是你的 IGN。登录后可在个人资料设置中修改密码。',
  },
  'login.failed': { en: 'Login failed', ko: '로그인에 실패했습니다', ja: "ログインに失敗しました", zh: '登录失败' },

  // ---- admin ----
  'admin.trackerSection': { en: 'Boss Attendance Tracker', ko: '보스 출석 트래커', ja: "ボス出席トラッカー", zh: '首领出勤追踪' },
  'admin.rosterSection': { en: 'Guild Roster', ko: '길드 로스터', ja: "ギルドロスター", zh: '公会名单' },
  'admin.rosterOverview': { en: 'Overview', ko: '개요', ja: "概要", zh: '概览' },
  'admin.dashboard': { en: 'Dashboard', ko: '대시보드', ja: "ダッシュボード", zh: '仪表板' },
  'admin.attendance': { en: 'Attendance', ko: '출석', ja: "出席", zh: '出勤' },
  'admin.bossConfig': { en: 'Boss Config', ko: '보스 설정', ja: "ボス設定", zh: '首领配置' },
  'admin.sheetTabs': { en: 'Sheet tabs', ko: '시트 탭', ja: "シートタブ", zh: '表格标签页' },
  'admin.signedInAs': { en: 'Signed in as {user}', ko: '로그인: {user}', ja: "ログイン中: {user}", zh: '已登录：{user}' },
  'admin.bossTitle': { en: 'Boss Attendance', ko: '보스 출석', ja: "ボス出席", zh: '首领出勤' },
  'admin.searchPh': { en: 'Search IGN or nickname…', ko: 'IGN 또는 닉네임 검색…', ja: "IGNまたはニックネームを検索…", zh: '搜索 IGN 或昵称…' },
  'admin.allColumns': { en: 'All columns', ko: '전체 열', ja: "すべての列", zh: '全部列' },
  'admin.allValues': { en: 'All values', ko: '전체 값', ja: "すべての値", zh: '全部值' },
  'admin.filterBy': { en: 'Filter by {col}', ko: '{col}로 필터', ja: "{col} で絞り込み", zh: '按 {col} 筛选' },
  'admin.clear': { en: 'Clear', ko: '초기화', ja: "クリア", zh: '清除' },
  'admin.addRow': { en: 'Add row', ko: '행 추가', ja: "行を追加", zh: '添加行' },
  'admin.memberRows': { en: '{a} member rows', ko: '멤버 행 {a}', ja: "メンバー行 {a}", zh: '{a} 行成员' },
  'admin.memberRowsOf': { en: '{a} of {b} member rows', ko: '멤버 행 {a}/{b}', ja: "メンバー行 {a}/{b}", zh: '{a}/{b} 行成员' },
  'admin.columnsCount': { en: '{a} columns', ko: '{a}열', ja: "{a} 列", zh: '{a} 列' },
  'admin.showingCols': { en: 'showing {a} of {b} columns', ko: '{b}열 중 {a}열 표시', ja: "{b} 列中 {a} 列を表示", zh: '显示 {b} 列中的 {a} 列' },
  'admin.editHint': {
    en: 'Click any cell to edit · changes save to the sheet instantly',
    ko: '셀을 클릭해 편집하세요 · 변경 사항이 시트에 즉시 저장됩니다', ja: "セルをクリックして編集 · 変更はシートに即時保存されます",
    zh: '点击任意单元格即可编辑 · 更改会立即保存到表格',
  },
  'admin.tip': { en: 'TIP', ko: '팁', ja: "ヒント", zh: '提示' },
  'admin.tipTitle': { en: 'Roles & Status Guide', ko: '역할 · 상태 가이드', ja: "役割・ステータスガイド", zh: '角色与状态指南' },
  'admin.tipStatus': { en: 'Status', ko: '상태', ja: "ステータス", zh: '状态' },
  'admin.tipRoles': { en: 'Roles', ko: '역할', ja: "役割", zh: '角色' },
  'admin.tipClose': { en: 'Close', ko: '닫기', ja: "閉じる", zh: '关闭' },
  'admin.tipStCore': {
    en: '≥30% attendance + High CP (150k+).',
    ko: '출석 30% 이상 + 높은 CP (15만 이상).', ja: "出席30%以上 + 高CP (15万以上)。",
    zh: '出勤 ≥30% + 高 CP（15 万以上）。',
  },
  'admin.tipStActive': {
    en: '≥30% attendance. Regular participant.',
    ko: '출석 30% 이상. 정기 참여자.', ja: "出席30%以上。常連参加者。",
    zh: '出勤 ≥30%。常驻参与者。',
  },
  'admin.tipStBusy': {
    en: 'Dropped below 30% directly from Core or Active.',
    ko: 'Core 또는 Active에서 바로 30% 미만으로 하락.', ja: "Core または Active から直接30%未満に低下。",
    zh: '从 Core 或 Active 直接跌至 30% 以下。',
  },
  'admin.tipStReserve': {
    en: '<30% attendance. No track record, or unexplained low attendance over time.',
    ko: '출석 30% 미만. 이력이 없거나, 기간 내내 설명되지 않는 저조한 출석.', ja: "出席30%未満。実績がない、または長期間にわたり説明不明の低い出席。",
    zh: '出勤 <30%。没有记录，或长期无法解释的低出勤。',
  },
  'admin.tipStProbation': {
    en: 'New member (2–3 weeks observation).',
    ko: '신규 멤버 (2–3주 관찰 기간).', ja: "新メンバー（2〜3週間の観察期間）。",
    zh: '新成员（2–3 周观察期）。',
  },
  'admin.tipStPending': {
    en: 'Discord approved; waiting for in-game application.',
    ko: '디스코드 승인 완료; 인게임 신청 대기 중.', ja: "Discord承認済み；ゲーム内申請を待機中。",
    zh: 'Discord 已批准；等待游戏内申请。',
  },
  'admin.tipStInactive': {
    en: 'Absent without notice (14+ consecutive days).',
    ko: '통보 없이 부재 (14일 이상 연속).', ja: "無断欠席（14日以上連続）。",
    zh: '无通知缺席（连续 14 天以上）。',
  },
  'admin.tipRoleLeader': { en: 'Final decision-making authority.', ko: '최종 결정권을 가짐.', ja: "最終決定権を持つ。", zh: '拥有最终决定权。' },
  'admin.tipRoleCoLeader': {
    en: 'Leads alongside the Guild Leader and supports guild oversight.',
    ko: '길드 리더와 함께 이끌며 길드 감독을 지원.', ja: "ギルドリーダーと共に指導し、ギルドの監督を支援する。",
    zh: '与公会会长共同领导并协助公会管理。',
  },
  'admin.tipRoleOfficer': {
    en: 'Works directly with the Guild Leader and Co-Leader on guild planning and coordination. Is kept informed of guild plans first.',
    ko: '길드 리더 및 Co-Leader와 직접 함께 길드 계획과 조율을 담당하며, 길드 계획을 가장 먼저 공유받음.', ja: "ギルドリーダーおよびCo-Leaderと直接協力し、ギルド計画と調整を担当。ギルド計画を最初に共有される。",
    zh: '直接与会长及 Co-Leader 协作，负责公会规划与协调，并最先获知公会计划。',
  },
  'admin.tipRoleSupport': {
    en: 'Helps with Discord tasks and member concerns. May lead battles or parties when leaders and Officers are unavailable.',
    ko: '디스코드 업무와 멤버 문의를 돕습니다. 리더와 Officer이 부재 시 배틀이나 파티를 이끌 수 있음.', ja: "Discordの業務とメンバーの相談を支援。リーダーやOfficerが不在の際はバトルやパーティを率いることができる。",
    zh: '协助处理 Discord 事务和成员问题。当会长与 Officer 不在时，可带领战斗或队伍。',
  },
  'admin.tipRoleSenior': {
    en: 'Leader-appointed for proven reliability, consistent contribution, and clear communication. A respected voice.',
    ko: '리더가 임명. 입증된 신뢰성, 꾸준한 기여, 명확한 소통. 존중받는 목소리.', ja: "リーダーが任命。証明された信頼性、一貫した貢献、明確なコミュニケーション。尊敬される声。",
    zh: '由会长任命，凭借可靠表现、持续贡献和清晰沟通。受人尊敬的声音。',
  },
  'admin.tipRoleMember': {
    en: 'Standard member role. Everyone starts here.',
    ko: '표준 멤버 직책. 모든 멤버는 여기서 시작합니다.', ja: "標準のメンバー役職。すべてのメンバーはここから始まる。",
    zh: '标准成员角色。所有人都从这里开始。',
  },
  'admin.noRows': { en: 'No rows match your filters.', ko: '필터 조건에 맞는 행이 없습니다.', ja: "フィルターに一致する行がありません。", zh: '没有符合筛选条件的行。' },
  'admin.addRowDesc': {
    en: 'The first column (IGN) is required and must be unique. Leave the rest empty to fill in later.',
    ko: '첫 번째 열(IGN)은 필수이며 고유해야 합니다. 나머지는 비워두고 나중에 채울 수 있습니다.', ja: "1列目（IGN）は必須で一意である必要があります。残りは空欄にして後で入力できます。",
    zh: '第一列（IGN）为必填且必须唯一。其余可留空，稍后填写。',
  },
  'admin.deleteRowTitle': { en: 'Delete row {n}?', ko: '{n}행을 삭제할까요?', ja: "{n}行を削除しますか？", zh: '删除第 {n} 行？' },
  'admin.deleteRow': { en: 'Delete row', ko: '행 삭제', ja: "行を削除", zh: '删除行' },
  'admin.deleteRowDesc': {
    en: 'This removes the row from “{title}” in the Google Sheet. This cannot be undone.',
    ko: '"{title}" 시트에서 해당 행을 삭제합니다. 이 작업은 되돌릴 수 없습니다.', ja: "Googleシートの「{title}」からこの行を削除します。元に戻せません。",
    zh: '这将从 Google 表格的“{title}”中删除该行。此操作无法撤销。',
  },
  'admin.settingsTitle': { en: 'Admin settings', ko: '관리자 설정', ja: "管理者設定", zh: '管理员设置' },
  'admin.settingsDesc': {
    en: 'Change the admin password. It is stored (hashed) in the hidden credentials tab of the spreadsheet.',
    ko: '관리자 비밀번호를 변경합니다. 비밀번호는 스프레드시트의 숨겨진 자격 증명 탭에 해시되어 저장됩니다.', ja: "管理者パスワードを変更します。パスワードはスプレッドシートの非表示資格情報タブに（ハッシュして）保存されます。",
    zh: '修改管理员密码。密码以哈希形式存储在电子表格的隐藏凭据标签页中。',
  },
  'admin.currentAdminPassword': { en: 'Current admin password', ko: '현재 관리자 비밀번호', ja: "現在の管理者パスワード", zh: '当前管理员密码' },
  'admin.passwordUpdated': { en: 'Admin password updated', ko: '관리자 비밀번호가 변경되었습니다', ja: "管理者パスワードを更新しました", zh: '管理员密码已更新' },
  'admin.couldNotSaveCell': { en: 'Could not save the cell', ko: '셀을 저장할 수 없습니다', ja: "セルを保存できませんでした", zh: '无法保存该单元格' },
  'admin.addedRow': { en: 'Added {ign} to {title}', ko: '{title}에 {ign} 추가됨', ja: "{title}に{ign}を追加しました", zh: '已将 {ign} 添加到 {title}' },
  'admin.couldNotAddRow': { en: 'Could not add the row', ko: '행을 추가할 수 없습니다', ja: "行を追加できませんでした", zh: '无法添加该行' },
  'admin.rowDeleted': { en: 'Row deleted', ko: '행이 삭제되었습니다', ja: "行を削除しました", zh: '行已删除' },
  'admin.couldNotDeleteRow': { en: 'Could not delete the row', ko: '행을 삭제할 수 없습니다', ja: "行を削除できませんでした", zh: '无法删除该行' },

  // ---- member ----
  'member.tag': { en: 'Member', ko: '멤버', ja: "メンバー", zh: '成员' },
  'member.myProfile': { en: 'My profile', ko: '내 프로필', ja: "自分のプロフィール", zh: '我的资料' },
  'member.profile': { en: 'Profile', ko: '프로필', ja: "プロフィール", zh: '个人资料' },
  'member.roster': { en: 'Roster', ko: '로스터', ja: "ロスター", zh: '名单' },
  'member.membersCount': { en: '{a} members', ko: '멤버 {a}명', ja: "メンバー {a}名", zh: '{a} 名成员' },
  'member.loading': { en: 'Loading…', ko: '로딩 중…', ja: "読み込み中…", zh: '加载中…' },
  'member.notOnRoster': {
    en: 'Not on the roster yet — ask an admin to add you',
    ko: '아직 로스터에 없습니다 — 관리자에게 추가를 요청하세요', ja: "まだロスターにいません — 管理者に追加を依頼してください",
    zh: '尚未加入名单 — 请联系管理员添加你',
  },
  'member.noRowProfile': {
    en: 'You don’t have a row in your profile yet. An admin can add you.',
    ko: '프로필에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.', ja: "まだプロフィールに行がありません。管理者が追加できます。",
    zh: '你的资料还没有对应的行。管理员可以添加你。',
  },
  'member.noRowTab': {
    en: 'You don’t have a row in this tab yet. An admin can add you.',
    ko: '이 탭에 아직 데이터가 없습니다. 관리자가 추가할 수 있습니다.', ja: "このタブにまだ行がありません。管理者が追加できます。",
    zh: '此标签页还没有你的行。管理员可以添加你。',
  },
  'member.adminManaged': {
    en: 'Managed by an admin — members cannot change this',
    ko: '관리자 관리 항목 — 멤버는 변경할 수 없습니다', ja: "管理者による管理項目 — メンバーは変更できません",
    zh: '由管理员管理 — 成员无法修改',
  },
  'member.settingsTitle': { en: 'Profile settings', ko: '프로필 설정', ja: "プロフィール設定", zh: '个人资料设置' },
  'member.settingsDesc': {
    en: 'Change your password. Your initial password is your IGN.',
    ko: '비밀번호를 변경합니다. 초기 비밀번호는 IGN입니다.', ja: "パスワードを変更します。初期パスワードはIGNです。",
    zh: '修改你的密码。初始密码是你的 IGN。',
  },
  'member.currentPassword': { en: 'Current password', ko: '현재 비밀번호', ja: "現在のパスワード", zh: '当前密码' },
  'member.passwordUpdated': { en: 'Password updated', ko: '비밀번호가 변경되었습니다', ja: "パスワードを更新しました", zh: '密码已更新' },
  'member.progressLabel': { en: 'Profile completion', ko: '프로필 완성도', ja: "プロフィール完成度", zh: '资料完成度' },
  'member.showMissing': { en: "See what's missing", ko: '채워야 할 항목 보기', ja: "未入力の項目を見る", zh: '查看缺少的项目' },
  'member.congrats': { en: 'Congratulations!', ko: '축하합니다!', ja: "おめでとうございます！", zh: '恭喜！' },
  'member.hideDetails': { en: 'Hide details', ko: '상세 숨기기', ja: "詳細を隠す", zh: '隐藏详情' },
  'member.missingTitle': { en: 'MISSING DETAILS', ko: '빠진 항목', ja: "未入力の項目", zh: '缺少的项目' },
  'member.allComplete': { en: 'Profile complete — nothing missing!', ko: '프로필이 완성되었습니다!', ja: "プロフィールは完成しています！", zh: '资料已完整填写！' },
  'member.usernameSection': { en: 'Change username', ko: '아이디 변경', ja: "ユーザー名の変更", zh: '修改用户名' },
  'member.passwordSection': { en: 'Change password', ko: '비밀번호 변경', ja: "パスワードの変更", zh: '修改密码' },
  'member.newUsername': { en: 'New username', ko: '새 아이디', ja: "新しいユーザー名", zh: '新用户名' },
  'member.changeUsername': { en: 'Update username', ko: '아이디 변경', ja: "ユーザー名を更新", zh: '更新用户名' },
  'member.usernameUpdated': { en: 'Username updated', ko: '아이디가 변경되었습니다', ja: "ユーザー名を更新しました", zh: '用户名已更新' },
  'member.usernameRequired': { en: 'Enter a username', ko: '아이디를 입력하세요', ja: "ユーザー名を入力してください", zh: '请输入用户名' },
  'member.usernameSame': { en: 'That is already your username', ko: '이미 사용 중인 아이디입니다', ja: "すでに同じユーザー名です", zh: '这已经是你的用户名' },
  'member.usernamePasswordRequired': { en: 'Enter your current password', ko: '현재 비밀번호를 입력하세요', ja: "現在のパスワードを入力してください", zh: '请输入你的当前密码' },
  'member.couldNotChangeUsername': { en: 'Could not change username', ko: '아이디를 변경할 수 없습니다', ja: "ユーザー名を変更できませんでした", zh: '无法修改用户名' },
  'member.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다', ja: "保存できませんでした", zh: '无法保存' },

  // ---- collection cell ----
  'cell.mark': { en: 'Click to mark', ko: '클릭하여 표시', ja: "クリックして記録", zh: '点击标记' },
  'cell.clear': { en: 'Click to clear', ko: '클릭하여 해제', ja: "クリックしてクリア", zh: '点击清除' },
  'cell.edit': { en: 'Click to edit', ko: '클릭하여 편집', ja: "クリックして編集", zh: '点击编辑' },

  // ---- guild roster ----
  'roster.members': { en: 'Members', ko: '멤버', ja: "メンバー", zh: '成员' },
  'roster.totalCp': { en: 'Total CP', ko: '총 CP', ja: "合計CP", zh: '总 CP' },
  'roster.avgCp': { en: 'Average CP', ko: '평균 CP', ja: "平均CP", zh: '平均 CP' },
  'roster.topCp': { en: 'Top CP', ko: '최고 CP', ja: "最高CP", zh: '最高 CP' },
  'roster.distTitle': { en: 'Combat Power Distribution', ko: '전투력 분포', ja: "戦闘力分布", zh: '战斗力分布' },
  'roster.noCp': { en: 'No CP recorded yet.', ko: '아직 기록된 CP가 없습니다.', ja: "まだCPが記録されていません。", zh: '尚未记录 CP。' },
  'roster.bracket0': { en: '< 100K', ko: '< 100K', ja: "< 100K", zh: '< 100K' },
  'roster.bracket1': { en: '100K – 125K', ko: '100K – 125K', ja: "100K – 125K", zh: '100K – 125K' },
  'roster.bracket2': { en: '125K – 150K', ko: '125K – 150K', ja: "125K – 150K", zh: '125K – 150K' },
  'roster.bracket3': { en: '150K – 175K', ko: '150K – 175K', ja: "150K – 175K", zh: '150K – 175K' },
  'roster.bracket4': { en: '175K – 200K', ko: '175K – 200K', ja: "175K – 200K", zh: '175K – 200K' },
  'roster.bracket5': { en: '≥ 200K', ko: '≥ 200K', ja: "≥ 200K", zh: '≥ 200K' },
  'roster.topMeta': { en: 'TOP 10 CP', ko: 'TOP 10 CP', ja: "TOP 10 CP", zh: 'TOP 10 CP' },
  'roster.cp': { en: 'CP', ko: 'CP', ja: "CP", zh: 'CP' },
  'roster.mainWeapon': { en: 'Main Weapon', ko: '메인 무기', ja: "メイン武器", zh: '主武器' },
  'roster.role': { en: 'Role', ko: '역할', ja: "役割", zh: '角色' },
  'roster.status': { en: 'Status', ko: '상태', ja: "ステータス", zh: '状态' },
  'roster.summaryMeta': {
    en: '{n} of {m} filled',
    ko: '{m}행 중 {n}행 기입', ja: "{m}行中 {n}行入力済み",
    zh: '{m} 行中已填 {n} 行',
  },
  'roster.noData': {
    en: 'No data recorded yet.',
    ko: '아직 기록된 데이터가 없습니다.', ja: "まだデータが記録されていません。",
    zh: '尚未记录数据。',
  },

  // ---- CP history (admin) ----
  'cp.change': { en: 'Change', ko: '변동', ja: "変化", zh: '变化' },
  'cp.historyHint': {
    en: 'Latest CP first · change vs the previous date',
    ko: '최신 CP 우선 · 이전 날짜 대비 변동', ja: "最新CP順 · 前回日付との変化",
    zh: '最新 CP 优先 · 与上一日期相比的变化',
  },

  // ---- boss tracker ----
  'boss.seeding': { en: 'Seeding the boss list…', ko: '보스 목록 생성 중…', ja: "ボスリストを作成中…", zh: '正在生成首领列表…' },
  'boss.noBosses': { en: 'No bosses configured yet.', ko: '아직 설정된 보스가 없습니다.', ja: "まだボスが設定されていません。", zh: '尚未配置首领。' },
  'boss.seed': { en: 'Seed bosses', ko: '보스 목록 생성', ja: "ボスを作成", zh: '生成首领' },
  'boss.seedErr': { en: 'Could not seed', ko: '보스 목록을 생성할 수 없습니다', ja: "作成できませんでした", zh: '无法生成' },
  'boss.meta': {
    en: 'bosses · set the point value awarded per attendance',
    ko: '보스 · 출석 시 지급할 포인트 값을 설정하세요', ja: "ボス · 出席時に付与するポイント値を設定してください",
    zh: '首领 · 设置每次出勤奖励的积分值',
  },
  'boss.changesInstant': { en: 'Changes save to the sheet instantly', ko: '변경 사항이 시트에 즉시 저장됩니다', ja: "変更はシートに即時保存されます", zh: '更改会立即保存到表格' },
  'boss.boss': { en: 'Boss', ko: '보스', ja: "ボス", zh: '首领' },
  'boss.level': { en: 'Level', ko: '레벨', ja: "レベル", zh: '等级' },
  'boss.respawn': { en: 'Respawn', ko: '리젠', ja: "リスポーン", zh: '重生' },
  'boss.points': { en: 'Points', ko: '포인트', ja: "ポイント", zh: '积分' },
  'boss.recordTitle': { en: 'Record attendance', ko: '출석 기록', ja: "出席を記録", zh: '记录出勤' },
  'boss.selected': { en: 'selected', ko: '명 선택', ja: "選択中", zh: '已选择' },
  'boss.ptsTotal': { en: 'pts total', ko: '포인트 합계', ja: "ポイント合計", zh: '积分合计' },
  'boss.filterMembers': { en: 'Filter members…', ko: '멤버 검색…', ja: "メンバーを絞り込み…", zh: '筛选成员…' },
  'boss.selectAll': { en: 'Select all', ko: '전체 선택', ja: "すべて選択", zh: '全选' },
  'boss.clear': { en: 'Clear', ko: '해제', ja: "クリア", zh: '清除' },
  'boss.scan': { en: 'Scan party screenshot', ko: '파티 스크린샷 스캔', ja: "パーティースクリーンショットをスキャン", zh: '扫描队伍截图' },
  'boss.scanning': { en: 'Reading screenshots…', ko: '스크린샷 읽는 중…', ja: "スクリーンショットを読み取り中…", zh: '正在读取截图…' },
  'boss.scanDone': { en: '{n} members selected from screenshots', ko: '스크린샷에서 {n}명 선택됨', ja: "スクリーンショットから {n}名を選択しました", zh: '已从截图选择 {n} 名成员' },
  'boss.scanNone': {
    en: 'No roster members found in the screenshots.',
    ko: '스크린샷에서 길드 멤버를 찾지 못했습니다.', ja: "スクリーンショットからギルドメンバーが見つかりませんでした。",
    zh: '截图中未找到名单成员。',
  },
  'boss.record': { en: 'Record attendance', ko: '출석 기록하기', ja: "出席を記録", zh: '记录出勤' },
  'boss.recordedToast': {
    en: 'Recorded {n} members (+{pts} pts each)',
    ko: '{n}명의 출석을 기록했습니다 (+{pts}점씩)', ja: "{n}名の出席を記録しました（各 +{pts}pt）",
    zh: '已记录 {n} 名成员（每人 +{pts} 分）',
  },
  'boss.noMembersMatch': { en: 'No members match.', ko: '일치하는 멤버가 없습니다.', ja: "一致するメンバーがいません。", zh: '没有匹配的成员。' },
  'boss.totalAwarded': { en: 'Total points awarded', ko: '지급된 총 포인트', ja: "支給された合計ポイント", zh: '已发放总积分' },
  'boss.membersWithPoints': { en: 'Members with points', ko: '포인트 보유 멤버', ja: "ポイント保有メンバー", zh: '拥有积分的成员' },
  'boss.bossesTracked': { en: 'Bosses tracked', ko: '추적 중인 보스', ja: "追跡中のボス", zh: '追踪中的首领' },
  'boss.membersOnBoard': { en: 'members on the board', ko: '명이 순위표에 있습니다', ja: "名がランクボードにいます", zh: '名成员在排行榜上' },
  'boss.top30': { en: 'Top 30%', ko: '상위 30%', ja: "上位30%", zh: '前 30%' },
  'boss.top30Meta': {
    en: '{n} in the top 30% band (≥ {threshold} pts)',
    ko: '상위 30% 이내 {n}명 (≥ {threshold}점)', ja: "上位30%バンドに {n}名（≥ {threshold}pt）",
    zh: '前 30% 区间内有 {n} 名（≥ {threshold} 分）',
  },
  'boss.noAttendance': { en: 'No attendance recorded yet.', ko: '아직 기록된 출석이 없습니다.', ja: "まだ出席が記録されていません。", zh: '尚未记录出勤。' },
  'boss.added': { en: 'Added {name}', ko: '{name} 추가됨', ja: "{name} を追加しました", zh: '已添加 {name}' },
  'boss.couldNotSave': { en: 'Could not save', ko: '저장할 수 없습니다', ja: "保存できませんでした", zh: '无法保存' },
  'boss.couldNotRecord': { en: 'Could not record attendance', ko: '출석을 기록할 수 없습니다', ja: "出席を記録できませんでした", zh: '无法记录出勤' },
  'boss.pt': { en: 'pt', ko: '점', ja: "pt", zh: '分' },
  'boss.pts': { en: 'pts', ko: '점', ja: "pt", zh: '分' },
  'boss.weekly': { en: 'Weekly', ko: '주간', ja: "週間", zh: '每周' },

  // ---- admin tools / distribution ----
  'tools.section': { en: 'ADMIN TOOLS', ko: '관리자 도구', ja: "管理者ツール", zh: '管理员工具' },
  'tools.profileCompletion': { en: 'Profile completion', ko: '프로필 완성도', ja: "プロフィール完成度", zh: '资料完成度' },
  'tools.noGuild': { en: 'NO GUILD', ko: '길드 없음', ja: "ギルドなし", zh: '无公会' },
  'tools.distribution': { en: 'Boss attendance distribution', ko: '보스 출석 분배', ja: "ボス出席分配", zh: '首领出勤分配' },
  'tools.distTitle': { en: 'Boss Attendance Distribution', ko: '보스 출석 분배', ja: "ボス出席分配", zh: '首领出勤分配' },
  'tools.band': { en: 'Top 30% contributors', ko: '상위 30% 기여자', ja: "上位30%貢献者", zh: '前 30% 贡献者' },
  'tools.pool': { en: 'Diamond pool', ko: '다이아몬드 풀', ja: "ダイヤモンドプール", zh: '钻石池' },
  'tools.save': { en: 'Save', ko: '저장', ja: "保存", zh: '保存' },
  'tools.savedNote': { en: 'Saved to {title}', ko: '{title}에 저장됨', ja: "{title}に保存済み", zh: '已保存到 {title}' },
  'tools.distributedOn': { en: 'Distributed on', ko: '분배일', ja: "分配日", zh: '分配日期' },
  'tools.points': { en: 'Points', ko: '포인트', ja: "ポイント", zh: '积分' },
  'tools.diamonds': { en: 'Diamonds', ko: '다이아몬드', ja: "ダイヤモンド", zh: '钻石' },
  'tools.totalBand': { en: 'Total band points', ko: '밴드 총 포인트', ja: "バンド合計ポイント", zh: '区间总积分' },
  'tools.members': { en: 'members', ko: '명', ja: "名", zh: '名' },
  'tools.empty': {
    en: 'No attendance points recorded yet.',
    ko: '아직 기록된 출석 포인트가 없습니다.', ja: "まだ出席ポイントが記録されていません。",
    zh: '尚未记录出勤积分。',
  },
  'tools.couldNot': { en: 'Could not distribute', ko: '분배를 완료할 수 없습니다', ja: "分配を完了できませんでした", zh: '无法完成分配' },
  'tools.confirmTitle': { en: 'Distribute diamonds?', ko: '다이아몬드를 분배할까요?', ja: "ダイヤモンドを分配しますか？", zh: '分配钻石？' },
  'tools.confirmHint': {
    en: 'This will save the distribution and reset the current attendance points.',
    ko: '분배 내용을 저장하고 현재 출석 포인트를 초기화합니다.', ja: "分配を保存し、現在の出席ポイントをリセットします。",
    zh: '这将保存分配并重置当前出勤积分。',
  },
  'tools.ok': { en: 'OK', ko: '확인', ja: "OK", zh: '确定' },

  // ---- admin tools / CP update ----
  'tools.cpUpdate': { en: 'CP Update', ko: 'CP 업데이트', ja: "CP更新", zh: 'CP 更新' },
  'tools.cpLeft': { en: 'Current CP', ko: '현재 CP', ja: "現在のCP", zh: '当前 CP' },
  'tools.cpRight': { en: 'Screenshot', ko: '스크린샷', ja: "スクリーンショット", zh: '截图' },
  'tools.cpUpload': { en: 'Upload', ko: '업로드', ja: "アップロード", zh: '上传' },
  'tools.cpNoImage': {
    en: 'Upload a screenshot to auto-read IGN and CP.',
    ko: '스크린샷을 업로드하면 IGN과 CP를 자동으로 읽습니다.', ja: "スクリーンショットをアップロードするとIGNとCPを自動で読み取ります。",
    zh: '上传截图以自动读取 IGN 和 CP。',
  },
  'tools.cpMatched': { en: 'Matched', ko: '일치', ja: "一致", zh: '已匹配' },
  'tools.cpUnmatched': { en: 'Unmatched', ko: '불일치', ja: "不一致", zh: '未匹配' },
  'tools.cpReading': { en: 'Reading screenshot…', ko: '스크린샷 읽는 중…', ja: "スクリーンショットを読み取り中…", zh: '正在读取截图…' },
  'tools.cpCouldNotRead': { en: 'Could not read the screenshot', ko: '스크린샷을 읽을 수 없습니다', ja: "スクリーンショットを読み取れませんでした", zh: '无法读取截图' },
  'tools.cpSomeFailed': { en: '{n} screenshot(s) failed to read', ko: '스크린샷 {n}개를 읽지 못했습니다', ja: "{n}枚のスクリーンショットの読み取りに失敗しました", zh: '{n} 张截图读取失败' },
  'tools.cpCouldNotSave': { en: 'Could not update CP', ko: 'CP를 업데이트할 수 없습니다', ja: "CPを更新できませんでした", zh: '无法更新 CP' },
  'tools.cpConfirmTitle': { en: 'Update CP?', ko: 'CP를 업데이트할까요?', ja: "CPを更新しますか？", zh: '更新 CP？' },
  'tools.cpConfirmHint': {
    en: 'This will update each member\'s CP in {basic} and record it in {history}.',
    ko: '각 멤버의 CP를 {basic}에 업데이트하고 {history}에 기록합니다.', ja: "各メンバーのCPを{basic}に更新し、{history}に記録します。",
    zh: '这将在 {basic} 中更新每位成员的 CP，并记录到 {history}。',
  },
  'tools.cpSaved': { en: 'Saved to {history}', ko: '{history}에 저장됨', ja: "{history}に保存済み", zh: '已保存到 {history}' },
  'tools.cpManualEdit': { en: 'Edit CP', ko: 'CP 편집', ja: "CPを編集", zh: '编辑 CP' },
  'tools.cpManualLabel': { en: 'New CP', ko: '새 CP', ja: "新しいCP", zh: '新 CP' },
  'tools.cpManualHint': {
    en: 'Saves to {basic} and records today\'s date in {history}.',
    ko: '{basic}에 저장하고 {history}에 오늘 날짜로 기록합니다.', ja: "{basic}に保存し、今日の日付を{history}に記録します。",
    zh: '保存到 {basic} 并在 {history} 中记录今天的日期。',
  },

  // ---- password modal ----
  'pw.newPassword': { en: 'New password', ko: '새 비밀번호', ja: "新しいパスワード", zh: '新密码' },
  'pw.confirmNew': { en: 'Confirm new password', ko: '새 비밀번호 확인', ja: "新しいパスワード（確認）", zh: '确认新密码' },
  'pw.update': { en: 'Update password', ko: '비밀번호 변경', ja: "パスワードを更新", zh: '更新密码' },
  'pw.mismatch': { en: 'New passwords do not match', ko: '새 비밀번호가 일치하지 않습니다', ja: "新しいパスワードが一致しません", zh: '两次输入的新密码不一致' },
  'pw.tooShort': { en: 'New password must be at least 6 characters', ko: '새 비밀번호는 6자 이상이어야 합니다', ja: "新しいパスワードは6文字以上にしてください", zh: '新密码至少需要 6 个字符' },
  'pw.couldNot': { en: 'Could not change password', ko: '비밀번호를 변경할 수 없습니다', ja: "パスワードを変更できませんでした", zh: '无法修改密码' },

  // ---- sheet tab titles (display-only) ----
  'tab.basicInformation': { en: 'Basic Information', ko: '기본 정보', ja: "基本情報", zh: '基本信息' },
  'tab.equipment': { en: 'Equipment', ko: '장비', ja: "装備", zh: '装备' },
  'tab.bossCollection': { en: 'Boss Collection', ko: '보스 컬렉션', ja: "ボスコレクション", zh: '首领图鉴' },
  'tab.successorCollection': { en: 'Successor Collection', ko: '계승자 컬렉션', ja: "継承者コレクション", zh: '继承者图鉴' },
  'tab.epicAccessoryCollection': { en: 'Epic +12 Accessory Collection', ko: '에픽 +12 액세서리 컬렉션', ja: "エピック+12アクセサリーコレクション", zh: '史诗 +12 饰品图鉴' },
  'tab.cloakCollection': { en: 'Cloak Collection', ko: '망토 컬렉션', ja: "マントコレクション", zh: '披风图鉴' },
  'tab.bossAttendance': { en: 'Boss Attendance', ko: '보스 출석', ja: "ボス出席", zh: '首领出勤' },
  'tab.bossConfig': { en: 'Boss Config', ko: '보스 설정', ja: "ボス設定", zh: '首领配置' },
  'tab.distributionHistory': { en: 'Distribution History', ko: '분배 내역', ja: "分配履歴", zh: '分配历史' },
  'tab.cpHistory': { en: 'CP History', ko: 'CP 기록', ja: "CP履歴", zh: 'CP 记录' },

  // ---- sheet column headers (display-only) ----
  'col.nation': { en: 'Nation', ko: '국가', ja: "国", zh: '国家' },
  'col.guild': { en: 'Guild', ko: '길드', ja: "ギルド", zh: '公会' },
  'col.role': { en: 'Role', ko: '역할', ja: "役割", zh: '角色' },
  'col.status': { en: 'Status', ko: '상태', ja: "ステータス", zh: '状态' },
  'col.nickname': { en: 'Nickname', ko: '닉네임', ja: "ニックネーム", zh: '昵称' },
  'col.notes': { en: 'Notes', ko: '메모', ja: "メモ", zh: '备注' },
  'col.mainWeapon': { en: 'Main Weapon', ko: '메인 무기', ja: "メイン武器", zh: '主武器' },
  'col.subWeapon': { en: 'Sub weapon', ko: '보조 무기', ja: "サブ武器", zh: '副武器' },
  'col.armor': { en: 'Armor', ko: '방어구', ja: "アーマー", zh: '护甲' },
  'col.necklace': { en: 'Necklace', ko: '목걸이', ja: "ネックレス", zh: '项链' },
  'col.ring': { en: 'Ring', ko: '반지', ja: "リング", zh: '戒指' },
  'col.earring': { en: 'Earring', ko: '귀걸이', ja: "イヤリング", zh: '耳环' },
  'col.earrings': { en: 'Earrings', ko: '귀걸이', ja: "イヤリング", zh: '耳环' },
  'col.bracelet': { en: 'Bracelet', ko: '팔찌', ja: "ブレスレット", zh: '手镯' },
  'col.belt': { en: 'Belt', ko: '벨트', ja: "ベルト", zh: '腰带' },
  'col.legendaryCloak': { en: 'Legendary cloak', ko: '레전더리 망토', ja: "レジェンダリー・マント", zh: '传说披风' },
  'col.points': { en: 'Points', ko: '포인트', ja: "ポイント", zh: '积分' },
  'col.reward': { en: 'Reward', ko: '보상', ja: "報酬", zh: '奖励' },
  'col.boss': { en: 'Boss', ko: '보스', ja: "ボス", zh: '首领' },
  'col.neck': { en: 'Neck', ko: '목', ja: "ネック", zh: '颈部' },
  'col.valor': { en: 'Valor', ko: '용맹', ja: "勇敢", zh: '勇气' },
  'col.accuracy': { en: 'Accuracy', ko: '명중', ja: "命中", zh: '命中' },
  'col.penetration': { en: 'Penetration', ko: '관통', ja: "貫通", zh: '穿透' },
  'col.critical': { en: 'Critical', ko: '치명타', ja: "クリティカル", zh: '暴击' },
  'col.enchantment10': { en: 'ENCHANTMENT +10', ko: '인챈트 +10', ja: "エンチャント +10", zh: '附魔 +10' },
  'col.oneOfEach0': { en: 'One of each type enchantment +0', ko: '종류별 1개 인챈트 +0', ja: "種類別1個 エンチャント +0", zh: '每种类型各 1 个附魔 +0' },
  'col.fivePiece0': { en: '5 pieces set enchantment +0', ko: '5개 세트 인챈트 +0', ja: "5点セット エンチャント +0", zh: '5 件套附魔 +0' },
  'col.oneOfEach12': { en: 'One of each type enchantment +12', ko: '종류별 1개 인챈트 +12', ja: "種類別1個 エンチャント +12", zh: '每种类型各 1 个附魔 +12' },
  'col.goldBloodCloak3': { en: 'Gold Blood Cloak+3', ko: '골드 블러드 망토+3', ja: "ゴールドブラッド・マント+3", zh: '金血披风+3' },
  'col.goldBloodCloak5': { en: 'Gold Blood Cloak+5', ko: '골드 블러드 망토+5', ja: "ゴールドブラッド・マント+5", zh: '金血披风+5' },
  'col.darkOrhCloak3': { en: 'Dark Orh Cloak+3', ko: '다크 오르 망토+3', ja: "ダークオル・マント+3", zh: '黑暗奥尔披风+3' },
  'col.darkOrhCloak5': { en: 'Dark Orh Cloak+5', ko: '다크 오르 망토+5', ja: "ダークオル・マント+5", zh: '黑暗奥尔披风+5' },
  'col.successorCloak3': { en: "Successor's Cloak+3", ko: '계승자의 망토+3', ja: "継承者のマント+3", zh: '继承者披风+3' },
  'col.successorCloak5': { en: "Successor's Cloak+5", ko: '계승자의 망토+5', ja: "継承者のマント+5", zh: '继承者披风+5' },

  // ---- boss names (display-only; ko/ja from ASTRA-Boss-Timer) ----
  'boss.venatus': { en: 'Venatus', ko: '베나투스', ja: "ベナトゥス", zh: '维纳图斯' },
  'boss.viorent': { en: 'Viorent', ko: '비오렌트', ja: "ビオレント", zh: '维奥伦特' },
  'boss.ego': { en: 'Ego', ko: '에고', ja: "エゴ", zh: '埃戈' },
  'boss.clemantis': { en: 'Clemantis', ko: '클레멘티스', ja: "クレメンティス", zh: '克莱曼蒂斯' },
  'boss.livera': { en: 'Livera', ko: '리베라', ja: "リベラ", zh: '利贝拉' },
  'boss.araneo': { en: 'Araneo', ko: '아라네오', ja: "アラネオ", zh: '阿拉内奥' },
  'boss.undomiel': { en: 'Undomiel', ko: '언두미엘', ja: "アンドゥミエル", zh: '安杜米尔' },
  'boss.saphirus': { en: 'Saphirus', ko: '사피루스', ja: "サピルス", zh: '萨菲鲁斯' },
  'boss.neutro': { en: 'Neutro', ko: '네우트로', ja: "ネウトロ", zh: '纽特罗' },
  'boss.ladyDalia': { en: 'Lady Dalia', ko: '레이디 달리아', ja: "レディ·ダリア", zh: '达莉亚夫人' },
  'boss.generalAquleus': { en: 'General Aquleus', ko: '장군 아쿨레우스', ja: "将軍アクレウス", zh: '阿库勒斯将军' },
  'boss.aquleus': { en: 'Aquleus', ko: '아쿨레우스', ja: "アクレウス", zh: '阿库勒斯' },
  'boss.thymele': { en: 'Thymele', ko: '튀멜레', ja: "テュメレ", zh: '缇梅莱' },
  'boss.amentis': { en: 'Amentis', ko: '아멘티스', ja: "アメンティス", zh: '阿门蒂斯' },
  'boss.baronBraudmore': { en: 'Baron Braudmore', ko: '남작 브라우드모어', ja: "ブラウドモア", zh: '布劳德莫尔男爵' },
  'boss.braudmore': { en: 'Braudmore', ko: '브라우드모어', ja: "ブラウドモア", zh: '布劳德莫尔' },
  'boss.milavy': { en: 'Milavy', ko: '밀라베', ja: "ミラベ", zh: '米拉维' },
  'boss.wannitas': { en: 'Wannitas', ko: '와니타스', ja: "ワニタス", zh: '万尼塔斯' },
  'boss.metus': { en: 'Metus', ko: '메투스', ja: "メトゥス", zh: '梅图斯' },
  'boss.duplican': { en: 'Duplican', ko: '듀플리칸', ja: "デュプリカン", zh: '杜普利坎' },
  'boss.shuliar': { en: 'Shuliar', ko: '슈라이어', ja: "シュライヤー", zh: '舒利亚尔' },
  'boss.ringor': { en: 'Ringor', ko: '링고르', ja: "リンゴル", zh: '林戈尔' },
  'boss.roderick': { en: 'Roderick', ko: '로데릭', ja: "ロデリック", zh: '罗德里克' },
  'boss.gareth': { en: 'Gareth', ko: '가레스', ja: "ガレス", zh: '加雷斯' },
  'boss.titore': { en: 'Titore', ko: '티토르', ja: "ティトル", zh: '蒂托尔' },
  'boss.larba': { en: 'Larba', ko: '라르바', ja: "ラルバ", zh: '拉尔巴' },
  'boss.catena': { en: 'Catena', ko: '카테나', ja: "カテナ", zh: '卡特娜' },
  'boss.auraq': { en: 'Auraq', ko: '아우라크', ja: "アウラーク", zh: '奥拉克' },
  'boss.secreta': { en: 'Secreta', ko: '세크레타', ja: "セクレタ", zh: '塞克雷塔' },
  'boss.ordo': { en: 'Ordo', ko: '오르도', ja: "オルド", zh: '奥尔多' },
  'boss.asta': { en: 'Asta', ko: '아스타', ja: "アスタ", zh: '阿斯塔' },
  'boss.supore': { en: 'Supore', ko: '수포르', ja: "スポル", zh: '苏波尔' },
  'boss.chaiflock': { en: 'Chaiflock', ko: '샤이프락', ja: "シャイフロック", zh: '夏弗洛克' },
  'boss.benji': { en: 'Benji', ko: '벤지', ja: "ベンジー", zh: '本吉' },
  'boss.libitina': { en: 'Libitina', ko: '리비티나', ja: "リビティーナ", zh: '利比蒂娜' },
  'boss.rakajeth': { en: 'Rakajeth', ko: '라카제스', ja: "ラカゼス", zh: '拉卡泽斯' },
  'boss.icaruthia': { en: 'Icaruthia', ko: '이카루시아', ja: "イカルシア", zh: '伊卡鲁西亚' },
  'boss.motti': { en: 'Motti', ko: '모티', ja: "モティ", zh: '莫蒂' },
  'boss.camalia': { en: 'Camalia', ko: '카말리아', ja: "カマリア", zh: '卡玛利亚' },
  'boss.nevaeh': { en: 'Nevaeh', ko: '네바', ja: "ネバ", zh: '内瓦' },
  'boss.tumier': { en: 'Tumier', ko: '투미어', ja: "トゥミエル", zh: '图米尔' },
  'boss.lucus': { en: 'Lucus', ko: '루크스', ja: "ルクス", zh: '卢克斯' },
  'boss.azzamHissan': { en: 'Azzam Hissan', ko: '아잠 히산', ja: "アザム・ヒサン", zh: '阿扎姆·希桑' },
  'boss.serad': { en: 'Serad', ko: '세라드', ja: "セラド", zh: '塞拉德' },
  'boss.serbis': { en: 'Serbis', ko: '세르비스', ja: "セルビス", zh: '塞尔比斯' },
  'boss.grayDawn': { en: 'Gray Dawn', ko: '그레이 던', ja: "グレイ・ドーン", zh: '灰黎明' },
  'boss.blackThorn': { en: 'Black Thorn', ko: '블랙 쏜', ja: "ブラック・ソーン", zh: '黑刺' },
  'boss.elSera': { en: 'El Sera', ko: '엘 세라', ja: "エル・セラ", zh: '艾尔·塞拉' },
  'boss.kransia': { en: 'Kransia', ko: '크란시아', ja: "クランシア", zh: '克兰西亚' },
};

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s = entry ? entry[lang] ?? entry.en : key;
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
    return v === 'ko' || v === 'ja' || v === 'zh' ? v : 'en';
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
    <select
      className="select lang-toggle"
      aria-label="Language"
      title="Language / 언어 / 日本語 / 中文"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
    >
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <option value="ja">日本語</option>
      <option value="zh">中文</option>
    </select>
  );
}
