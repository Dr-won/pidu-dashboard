// 시작점. 로그인 상태를 확인하고 주소에 맞는 화면을 띄운다.
//
// 가입은 여기서 받지 않는다. 앱에서 가입하고 승인을 기다리는 흐름이 이미
// 있는데 웹에도 같은 것을 두면 두 군데를 다 손봐야 한다. 웹은 **보는 자리**다.

import * as db from './db.js?v=e568c44';
import { el, esc, render, errorBox } from './ui.js?v=e568c44';

import { approvalsPage } from './pages/approvals.js?v=e568c44';
import { intakePage } from './pages/intake.js?v=e568c44';
import { homePage } from './pages/home.js?v=e568c44';
import { kindPage } from './pages/kind.js?v=e568c44';
import { subjectsPage } from './pages/subjects.js?v=e568c44';
import { subjectPage } from './pages/subject.js?v=e568c44';
import { assessmentPage } from './pages/assessment.js?v=e568c44';
import { overviewPage } from './pages/overview.js?v=e568c44';
import { reportPage } from './pages/report.js?v=e568c44';

let me = null; // 로그인한 사람의 profiles 줄

// ---- 주소 → 화면 ----

const ROUTES = [
  [/^#\/home\/?$/,                     () => homePage()],
  // 종류 → 사람 → 그 사람의 그 종류 기록. 첫 화면에서 들어오는 길이다.
  [/^#\/kind\/(\w+)\/([\w-]+)$/,       (m) => subjectPage(m[2], m[1])],
  [/^#\/kind\/(\w+)\/?$/,              (m) => kindPage(m[1])],
  [/^#\/subjects\/?$/,                 () => subjectsPage()],
  [/^#\/subject\/([\w-]+)$/,           (m) => subjectPage(m[1])],
  [/^#\/assessment\/([\w-]+)$/,        (m) => assessmentPage(m[1])],
  [/^#\/report\/([\w-]+)$/,            (m) => reportPage(m[1])],
  [/^#\/overview\/?$/,                 () => overviewPage()],
  [/^#\/approvals\/?$/,                () => approvalsPage()],
  [/^#\/intake\/?$/,                   () => intakePage()],
];

async function route() {
  const hash = location.hash || '#/home';

  for (const [re, run] of ROUTES) {
    const m = re.exec(hash);
    if (!m) continue;
    markNav(hash);
    try {
      await run(m);
    } catch (e) {
      render(errorBox(e));
    }
    return;
  }

  location.hash = '#/home';
}

function markNav(hash) {
  const here = hash.split('/')[1] ?? '';
  for (const a of document.querySelectorAll('#nav a')) {
    // 하위 화면(대상자 상세)에 있어도 상위 메뉴에 표시가 남아야 길을 잃지 않는다.
    //
    // 측정 상세와 보고서는 두 갈래로 들어온다 — 첫 화면(종류)에서도,
    // 대상자 목록에서도. 어느 쪽으로 왔는지 주소만 보고는 알 수 없어
    // 대상자 쪽에 표시한다. 빵부스러기가 실제로 온 길을 보여 준다.
    const on = a.dataset.route === here
      || (a.dataset.route === 'home' && here === 'kind')
      || (a.dataset.route === 'subjects' && ['subject', 'assessment', 'report'].includes(here));
    a.classList.toggle('on', on);
  }
}

// ---- 로그인 앞 화면들 ----

/** 로그인 전에는 왼쪽 메뉴를 접으므로 이름표를 로그인 칸 위에 둔다. */
const gateBrand = `
  <div class="gate-brand">
    <img src="img/drpma_icon.png" alt="">
    <span><b>Dr.PMA 대시보드</b><small>측정 자료를 PC 에서 봅니다</small></span>
  </div>`;

function setupNeeded() {
  render(`
    <div class="gate">
      ${gateBrand}
      <h1>설정이 필요합니다</h1>
      <div class="notice notice-wait">
        Supabase 주소와 공개 키가 비어 있습니다.
      </div>
      <p class="sub">
        Supabase 프로젝트를 만든 뒤 <code>dashboard/config.js</code> 의 두 줄을 채워 주세요.
        표와 정책은 <code>server/01_schema.sql</code>, <code>server/02_policies.sql</code> 을
        SQL Editor 에 붙여 넣으면 만들어집니다.
      </p>
    </div>`);
}

function loginPage(message = '') {
  render(`
    <div class="gate">
      ${gateBrand}
      <h1>로그인</h1>
      <p class="sub">앱에서 쓰는 계정으로 들어옵니다. 가입은 앱에서 합니다.</p>
      ${message ? `<div class="notice notice-error">${esc(message)}</div>` : ''}
      <form id="login">
        <div class="field">
          <label for="email">이메일</label>
          <input type="email" id="email" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="pw">비밀번호</label>
          <input type="password" id="pw" autocomplete="current-password" required>
        </div>
        <button class="btn" type="submit" id="go" style="width:100%">로그인</button>
      </form>
    </div>`);

  el('#login').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = el('#go');
    btn.disabled = true;
    btn.textContent = '들어가는 중…';
    try {
      await db.signIn(el('#email').value.trim(), el('#pw').value);
      await start();
    } catch (e) {
      const raw = String(e?.message ?? e);
      loginPage(/Invalid login|credentials/i.test(raw)
        ? '이메일이나 비밀번호가 맞지 않습니다.'
        : raw);
    }
  };
}

/** 로그인은 됐지만 아직 승인 전이거나 거절된 경우. */
function notApprovedPage(profile) {
  const rejected = profile?.status === 'rejected';
  render(`
    <div class="gate">
      ${gateBrand}
      <h1>${rejected ? '승인되지 않았습니다' : '승인 대기 중입니다'}</h1>
      <div class="notice ${rejected ? 'notice-error' : 'notice-wait'}">
        ${rejected
          ? '이 계정은 자료를 볼 수 없습니다. 담당 교수에게 문의해 주세요.'
          : '담당 교수가 승인하면 자료를 볼 수 있습니다. 승인 전에도 앱에서 측정과 저장은 됩니다.'}
      </div>
      <button class="btn btn-line" id="out" style="width:100%">로그아웃</button>
    </div>`);
  el('#out').onclick = async () => { await db.signOut(); await start(); };
}

/** profiles 에 줄이 없는 경우. 앱에서 가입을 마치지 않은 계정이다. */
function noProfilePage() {
  render(`
    <div class="gate">
      ${gateBrand}
      <h1>계정 정보가 없습니다</h1>
      <div class="notice notice-wait">
        로그인은 됐지만 측정자 정보가 등록돼 있지 않습니다.
        앱에서 한 번 로그인하면 등록됩니다.
      </div>
      <button class="btn btn-line" id="out" style="width:100%">로그아웃</button>
    </div>`);
  el('#out').onclick = async () => { await db.signOut(); await start(); };
}

// ---- 시작 ----

function showChrome(on) {
  el('#nav').hidden = !on;
  el('#who').hidden = !on;
  // 왼쪽 메뉴 칸 전체를 접고 펴는 표시. 로그인 전에는 빈 칸만 남기 때문이다.
  document.body.classList.toggle('signed-in', on);
}

async function start() {
  if (!db.configured) {
    showChrome(false);
    return setupNeeded();
  }

  const user = await db.currentUser();
  if (!user) {
    showChrome(false);
    return loginPage();
  }

  try {
    me = await db.myProfile();
  } catch (e) {
    showChrome(false);
    return render(errorBox(e));
  }

  if (!me) { showChrome(false); return noProfilePage(); }
  if (me.status !== 'approved') { showChrome(false); return notApprovedPage(me); }

  showChrome(true);
  el('#who-name').textContent =
    [me.display_name, me.rater_code].filter(Boolean).join(' · ');
  el('#who-av').textContent = (me.display_name || me.rater_code || '?').trim().charAt(0);

  // 관리자 메뉴는 관리자에게만. 학생이 눌러도 서버가 막지만, 못 쓸 메뉴를
  // 보여 주면 눌러 보고 오류를 만난다.
  for (const a of document.querySelectorAll('[data-admin-only]')) {
    a.hidden = me.role !== 'admin';
  }

  await route();
}

el('#signout').onclick = async () => {
  await db.signOut();
  location.hash = '';
  await start();
};

window.addEventListener('hashchange', () => { if (me) route(); });

start();
