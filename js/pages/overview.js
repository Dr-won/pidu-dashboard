// 수집 현황. 누가 몇 명을 몇 번 쟀는지.
//
// 수업에서 학생들이 자료를 모을 때, 누가 아직 안 했는지를 선생님이 한눈에
// 봐야 한다. 그걸 물어보려고 학생 폰을 걷는 것이 원래 문제였다.

import * as db from '../db.js?v=432fda0';
import { esc, render, loading, errorBox, fmtDate, protocolKo } from '../ui.js?v=432fda0';

export async function overviewPage() {
  loading();
  let assessments, raters, subjects;
  try {
    [assessments, subjects] = await Promise.all([
      db.recentAssessments(1000),
      db.subjects(),
    ]);
    // 관리자가 아니면 목록이 막혀 빈 배열이 온다. 그래도 화면은 돈다.
    raters = await db.allRaters().catch(() => []);
  } catch (e) {
    return render(`<h1>수집 현황</h1>${errorBox(e)}`);
  }

  const byRater = groupBy(assessments, (a) => a.rater_code || '(측정자 미상)');
  const byProtocol = groupBy(assessments, (a) => a.protocol);
  const approved = raters.filter((r) => r.status === 'approved');

  render(`
    <h1>수집 현황</h1>
    <p class="sub">최근 측정 ${assessments.length}건 기준입니다. 본인이 잰 자료만 보이는 계정도 있습니다.</p>

    <div class="grid" style="margin-bottom:8px">
      ${stat(subjects.length, '대상자')}
      ${stat(assessments.length, '측정 건수')}
      ${stat(byRater.size, '측정자')}
      ${stat(consentGaps(subjects), '동의 확인일 없음', consentGaps(subjects) > 0)}
    </div>

    <h2>측정자별</h2>
    ${byRater.size === 0
      ? '<div class="card"><span style="color:var(--muted)">아직 올라온 측정이 없습니다.</span></div>'
      : `<div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr>
              <th>측정자</th><th>이름</th>
              <th class="num">대상자</th><th class="num">측정</th><th>마지막 측정</th>
            </tr></thead>
            <tbody>${raterRows(byRater, raters)}</tbody>
          </table>
        </div>`}

    ${approved.length > byRater.size ? idleNotice(approved, byRater) : ''}

    <h2>측정 종류별</h2>
    ${byProtocol.size === 0
      ? '<div class="card"><span style="color:var(--muted)">없습니다.</span></div>'
      : `<div class="grid">${[...byProtocol.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([p, list]) => stat(list.length, protocolKo(p))).join('')}</div>`}
  `);
}

const stat = (num, label, warn = false) => `
  <div class="stat">
    <div class="stat-num"${warn ? ' style="color:var(--invalid)"' : ''}>${esc(num)}</div>
    <div class="stat-label">${esc(label)}</div>
  </div>`;

function raterRows(byRater, raters) {
  const nameOf = new Map(raters.map((r) => [r.rater_code, r.display_name]));

  return [...byRater.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([code, list]) => {
      const subjectCount = new Set(list.map((a) => a.subject_id)).size;
      const last = list.reduce((m, a) =>
        !m || new Date(a.recorded_at) > new Date(m) ? a.recorded_at : m, null);
      return `<tr>
        <td><b>${esc(code)}</b></td>
        <td>${esc(nameOf.get(code) || '—')}</td>
        <td class="num">${subjectCount}</td>
        <td class="num">${list.length}</td>
        <td>${esc(fmtDate(last, false))}</td>
      </tr>`;
    }).join('');
}

/**
 * 승인은 받았는데 아직 한 건도 안 올린 사람.
 *
 * 0건인 사람은 위 표에 아예 줄이 없다. 없는 것은 눈에 안 띄므로 따로 알린다.
 */
function idleNotice(approved, byRater) {
  const idle = approved.filter((r) => r.rater_code && !byRater.has(r.rater_code));
  if (!idle.length) return '';
  return `
    <div class="notice notice-wait" style="margin-top:12px">
      <b>아직 한 건도 올리지 않은 측정자 ${idle.length}명</b><br>
      ${esc(idle.map((r) => `${r.display_name}(${r.rater_code})`).join(', '))}
    </div>`;
}

const consentGaps = (subjects) => subjects.filter((s) => !s.consent_at).length;

function groupBy(rows, keyOf) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}
