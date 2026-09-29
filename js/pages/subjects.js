// 대상자 목록. 여기서 시작해 측정 기록으로 들어간다.
//
// 대상자 표에는 이름·생년월일·연락처가 없다(server/01_schema.sql). 연구코드로만
// 찾는다. 사람이 많아지면 연구코드만으로는 누군지 모르므로 집단·성별·나이를
// 같이 보여 준다.
//
// 접수 화면으로 받은 사람은 접수함에 이름이 있다. 그건 **관리자에게만** 곁들여
// 보여 준다(서버 정책이 접수함을 관리자에게만 연다). 이름을 대상자 표로 옮기지는
// 않는다 — 그 표는 연구 자료로 그대로 내보내는 자리다.

import * as db from '../db.js?v=432fda0';
import { esc, render, loading, errorBox, fmtDate } from '../ui.js?v=432fda0';

let cache = null;

export async function subjectsPage() {
  loading();
  let rows, counts, names;
  try {
    rows = await db.subjects();
    counts = await countsBySubject();
    names = await db.namesByCode();
  } catch (e) {
    return render(`<h1>대상자</h1>${errorBox(e)}`);
  }

  cache = rows.map((s) => ({
    ...s,
    _count: counts.get(s.id) ?? 0,
    _name: names[s.research_code] ?? '',
  }));

  render(`
    <h1>대상자</h1>
    <p class="sub">연구코드로 식별합니다. 이름은 대상자 표에 저장하지 않고, 사진 접수 때 받은 것을 곁들여 보여 줍니다.</p>

    ${cache.length === 0 ? emptyNotice() : `
      <div class="field" style="max-width:320px">
        <input type="search" id="q" placeholder="이름·연구코드·집단으로 찾기" autocomplete="off">
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <table>
          <thead><tr>
            <th>연구코드</th><th>이름</th><th>집단</th><th>성별</th>
            <th class="num">출생연도</th><th class="num">키</th><th class="num">체중</th>
            <th class="num">측정</th><th>동의 확인</th>
          </tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <p class="sub" id="hint" style="margin-top:12px"></p>
    `}
  `);

  if (cache.length === 0) return;

  const q = document.querySelector('#q');
  q.oninput = () => draw(q.value.trim());
  draw('');
}

function emptyNotice() {
  return `
    <div class="notice notice-info">
      아직 올라온 대상자가 없습니다.<br>
      앱에 <b>측정 자료 올리기</b>가 아직 붙지 않았습니다. 그 기능이 들어가면 여기에 나타납니다.
    </div>`;
}

function draw(query) {
  const needle = query.toLowerCase();
  const rows = needle
    ? cache.filter((s) =>
        (s.research_code ?? '').toLowerCase().includes(needle) ||
        (s._name ?? '').toLowerCase().includes(needle) ||
        (s.group_label ?? '').toLowerCase().includes(needle))
    : cache;

  document.querySelector('#tbody').innerHTML = rows.map((s) => `
    <tr class="clickable" onclick="location.hash='#/subject/${esc(s.id)}'">
      <td><b>${esc(s.research_code)}</b></td>
      <td>${s._name ? esc(s._name) : '—'}</td>
      <td>${esc(s.group_label || '—')}</td>
      <td>${esc(sexKo(s.sex))}</td>
      <td class="num">${esc(s.birth_year || '—')}</td>
      <td class="num">${s.height_cm ? esc(s.height_cm) + ' cm' : '—'}</td>
      <td class="num">${s.weight_kg ? esc(s.weight_kg) + ' kg' : '—'}</td>
      <td class="num">${s._count}</td>
      <td>${s.consent_at ? esc(fmtDate(s.consent_at, false)) : '<span class="tag tag-invalid">없음</span>'}</td>
    </tr>`).join('');

  document.querySelector('#hint').textContent =
    needle ? `${rows.length}명 (전체 ${cache.length}명)` : `${cache.length}명`;
}

const sexKo = (s) => ({ male: '남', female: '여', M: '남', F: '여' }[s] ?? (s || '—'));

/**
 * 대상자별 측정 건수.
 *
 * 대상자마다 따로 세면 요청이 사람 수만큼 나간다. 한 번에 가져와 센다.
 * 자료가 아주 많아지면 서버 쪽 view 로 옮기는 편이 낫다.
 */
async function countsBySubject() {
  const rows = await db.recentAssessments(1000);
  const m = new Map();
  for (const a of rows) m.set(a.subject_id, (m.get(a.subject_id) ?? 0) + 1);
  return m;
}
