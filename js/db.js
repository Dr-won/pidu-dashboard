// 서버(Supabase)와 주고받는 것 전부. 화면은 여기만 부른다.
//
// 누가 무엇을 볼 수 있는지는 **여기서 거르지 않는다.** 서버 정책(RLS)이
// 판단한다 — server/02_policies.sql. 학생이 남의 자료를 요청하면 빈 목록이
// 돌아올 뿐이다. 브라우저 코드는 누구나 고쳐 볼 수 있으니 여기서 거르는 것은
// 잠금장치가 아니라 안내판에 지나지 않는다.

// supabase-js 는 vendor/ 에 통째로 받아 뒀다. CDN 에서 그때그때 불러오지
// 않는다 — 건강 정보와 얼굴 사진을 다루는 화면이라, 남의 서버가 보내 주는
// 코드가 브라우저에서 돌게 두면 그쪽이 바뀌는 날 이쪽도 바뀐다.
// 새 판으로 올리는 법은 vendor/README.md 에 적어 뒀다.
import { createClient } from '../vendor/supabase.js?v=432fda0';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js?v=432fda0';

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/** 서버가 준 오류를 그대로 던진다. 화면이 받아서 사람 말로 바꾼다. */
function ok({ data, error }) {
  if (error) throw error;
  return data;
}

// ---- 계정 ----

export async function currentUser() {
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

export async function myProfile() {
  const u = await currentUser();
  if (!u) return null;
  return ok(await sb.from('profiles').select('*').eq('id', u.id).maybeSingle());
}

export const signIn = (email, password) =>
  sb.auth.signInWithPassword({ email, password }).then(ok);

export const signOut = () => sb.auth.signOut();

// ---- 측정자 승인 ----

export const pendingRaters = () =>
  ok_(sb.from('profiles').select('*').eq('status', 'pending').order('requested_at'));

export const decidedRaters = () =>
  ok_(sb.from('profiles').select('*').neq('status', 'pending')
        .order('decided_at', { ascending: false }));

export const allRaters = () =>
  ok_(sb.from('profiles').select('*').order('rater_code', { nullsFirst: false }));

/**
 * 다음 측정자 코드(S01, S02 …). 앱의 Cloud.nextRaterCode 와 같은 규칙이다.
 *
 * 두 곳에서 같은 번호를 동시에 줄 수 있지만, rater_code 에 unique 가 걸려
 * 있어 뒤에 넣는 쪽이 실패한다. 화면은 그 실패를 "이미 쓰는 코드"로 알린다.
 */
export async function nextRaterCode() {
  const rows = await ok_(sb.from('profiles').select('rater_code'));
  let max = 0;
  for (const r of rows) {
    const m = /^S(\d+)$/.exec(r.rater_code ?? '');
    const n = m ? parseInt(m[1], 10) : NaN;
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return 'S' + String(max + 1).padStart(2, '0');
}

export async function approveRater(id, raterCode) {
  const u = await currentUser();
  return ok_(sb.from('profiles').update({
    status: 'approved',
    rater_code: raterCode,
    decided_at: new Date().toISOString(),
    decided_by: u?.id ?? null,
  }).eq('id', id));
}

export async function rejectRater(id) {
  const u = await currentUser();
  return ok_(sb.from('profiles').update({
    status: 'rejected',
    decided_at: new Date().toISOString(),
    decided_by: u?.id ?? null,
  }).eq('id', id));
}

// ---- 사진 접수 ----
//
// 접수코드를 아는 사람은 로그인 없이 사진을 보낼 수 있다(upload.html).
// 여기 있는 것들은 코드를 만들고 끄는 쪽이라 관리자만 쓴다 — 막는 것은
// 서버 정책이고, 이 함수들은 그냥 부른다.

export const intakeCodes = () =>
  ok_(sb.from('intake_codes').select('*').order('created_at', { ascending: false }));

export async function addIntakeCode(code, label) {
  const u = await currentUser();
  return ok_(sb.from('intake_codes').insert({ code, label, owner: u?.id ?? null }));
}

/**
 * 연구코드 → 이름. 접수 화면으로 받은 사람만 나온다.
 *
 * 대상자 표에는 이름을 두지 않는다(`core/models/subject.dart` 에 그 까닭이
 * 적혀 있다). 그런데 목록이 KY-15688 처럼 코드만 보이면 누가 누군지 알 수
 * 없다는 말을 들었다. 접수함에는 이름이 있으니 이어서 보여 준다.
 *
 * 접수함은 관리자만 읽는다(서버 정책). 학생이 부르면 빈 것이 돌아온다.
 */
export async function namesByCode() {
  try {
    const rows = await ok_(sb.from('intake_uploads')
      .select('research_code,name')
      .not('research_code', 'is', null));
    const out = {};
    for (const r of rows) out[r.research_code] = r.name;
    return out;
  } catch {
    // 이름이 없어도 목록은 보여야 한다.
    return {};
  }
}

export const setIntakeCodeActive = (code, active) =>
  ok_(sb.from('intake_codes').update({ active }).eq('code', code));

/**
 * 아직 PC 로 가져가지 않은 접수.
 *
 * 다시 보낸 것이 있으면 앞서 보낸 줄에는 `replaced_at` 이 찍힌다(서버
 * 트리거). 그건 빼고 마지막 것만 센다 — 한 사람이 두 번 보였다가
 * 두 번 잰 것으로 읽히면 안 된다.
 */
export const intakeWaiting = () =>
  ok_(sb.from('intake_uploads').select('*')
        .is('taken_at', null).is('replaced_at', null)
        .order('created_at', { ascending: false }));

// ---- 대상자와 측정 ----

export const subjects = () =>
  ok_(sb.from('subjects').select('*').order('research_code'));

export const subject = (id) =>
  ok_(sb.from('subjects').select('*').eq('id', id).maybeSingle());

export const assessmentsOf = (subjectId) =>
  ok_(sb.from('assessments').select('*')
        .eq('subject_id', subjectId).order('recorded_at', { ascending: false }));

export const assessment = (id) =>
  ok_(sb.from('assessments').select('*, subjects(*)').eq('id', id).maybeSingle());

export const measurementsOf = (assessmentId) =>
  ok_(sb.from('measurements').select('*')
        .eq('assessment_id', assessmentId).order('metric_key').order('trial'));

export const snapshotsOf = (assessmentId) =>
  ok_(sb.from('snapshots').select('*')
        .eq('assessment_id', assessmentId).order('created_at'));

/**
 * 보고서 쪽 그림. 앱이 그날 보고서를 쪽마다 그림으로 올린다.
 *
 * 사진과 같은 표(`snapshots`)에 들어 있고 파일 이름(`report_pN.png`)으로
 * 가른다. 새 표를 만들려면 서버 설정을 바꿔야 해서 이렇게 했다
 * (`lib/core/cloud/cloud_upload_sink.dart` 의 putReportPages).
 */
export const REPORT_PAGE = '/report_p';

export const isReportPage = (s) => String(s.path ?? '').includes(REPORT_PAGE);

export async function reportPagesOf(assessmentIds) {
  if (!assessmentIds.length) return [];
  const rows = await ok_(sb.from('snapshots').select('*')
    .in('assessment_id', assessmentIds)
    .like('path', `%${REPORT_PAGE}%`));
  // report_p10 이 report_p2 앞에 오지 않게 숫자로 줄 세운다.
  const pageNo = (p) => parseInt(/report_p(\d+)/.exec(p)?.[1] ?? '0', 10);
  return rows.sort((a, b) => pageNo(a.path) - pageNo(b.path));
}

/** 최근 측정 몇 건. 수집 현황에서 쓴다. */
export const recentAssessments = (limit = 200) =>
  ok_(sb.from('assessments').select('*, subjects(research_code)')
        .order('recorded_at', { ascending: false }).limit(limit));

// ---- 사진 ----

/**
 * 사진을 여는 임시 링크. 10분 뒤 만료된다(계획서 기준).
 *
 * 보관함이 비공개라 주소만으로는 열리지 않는다. 링크를 남에게 넘겨도
 * 10분 뒤에는 죽고, 애초에 정책상 열 수 있는 사람만 링크를 받을 수 있다.
 */
export async function snapshotUrl(path) {
  const { data, error } = await sb.storage.from('snapshots')
    .createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

// createClient 가 없을 때(설정 전)는 부르지 않는다. main.js 가 먼저 막는다.
async function ok_(q) { return ok(await q); }
