// 한 종류(체형분석·보행분석·운동·관절가동범위)를 받은 사람들.
//
// 첫 화면에서 띠를 누르면 여기로 온다. 사람을 고르면 그 사람의 **그 종류**
// 기록만 본다(`subject.js` 에 종류를 넘긴다). 체형분석을 보러 들어왔는데
// 보행 기록까지 섞여 나오면 찾던 것을 다시 찾아야 한다.

import * as db from '../db.js?v=e568c44';
import { kindById } from '../kinds.js?v=e568c44';
import { esc, render, loading, errorBox, fmtDate } from '../ui.js?v=e568c44';

let cache = null;
let kind = null;

export async function kindPage(kindId) {
  kind = kindById(kindId);
  if (!kind) {
    location.hash = '#/home';
    return;
  }

  loading();
  let rows, names;
  try {
    rows = await db.assessmentsByProtocols(kind.protocols);
    names = await db.namesByCode();
  } catch (e) {
    return render(`${crumb()}<h1>${esc(kind.title)}</h1>${errorBox(e)}`);
  }

  cache = groupBySubject(rows, names);

  render(`
    ${crumb()}
    <h1>${esc(kind.title)}</h1>
    <p class="sub">${esc(kind.sub)} · 사람을 고르면 그 사람의 ${esc(kind.title)} 기록만 봅니다.</p>

    ${cache.length === 0 ? `
      <div class="notice notice-info">
        아직 올라온 ${esc(kind.title)} 기록이 없습니다.
        앱에서 재고 올리면 여기에 나타납니다.
      </div>` : `
      <div class="row" style="margin-bottom:14px">
        <div class="search" style="flex:1">
          <input type="search" id="q" placeholder="이름·연구코드·집단으로 찾기" autocomplete="off">
        </div>
        <span class="muted" id="hint" style="font-size:13.5px"></span>
      </div>
      <div class="card card-table">
        <table>
          <thead><tr>
            <th>연구코드</th><th>이름</th><th>집단</th><th>성별</th>
            <th class="num">측정</th><th>최근 측정</th><th></th>
          </tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    `}
  `);

  if (!cache.length) return;

  const q = document.querySelector('#q');
  q.oninput = () => draw(q.value.trim());
  draw('');
}

const crumb = () => '<div class="crumb"><a href="#/home">측정 자료</a></div>';

/**
 * 측정 줄을 사람별로 묶는다.
 *
 * 서버가 측정 한 건에 대상자 정보를 붙여 준다(`subjects(*)`). 사람 수만큼
 * 다시 묻지 않으려고 그 안에 든 것을 그대로 쓴다.
 */
function groupBySubject(rows, names) {
  const m = new Map();
  for (const a of rows) {
    const s = a.subjects;
    if (!s) continue; // 대상자를 볼 권한이 없으면 서버가 비워 보낸다.
    const got = m.get(s.id);
    if (got) {
      got.count += 1;
      continue;
    }
    m.set(s.id, {
      ...s,
      count: 1,
      // 내림차순으로 받았으므로 처음 만난 것이 가장 최근이다.
      latest: a.recorded_at,
      name: names[s.research_code] ?? '',
    });
  }
  return [...m.values()].sort((a, b) => new Date(b.latest) - new Date(a.latest));
}

function draw(query) {
  const needle = query.toLowerCase();
  const rows = needle
    ? cache.filter((s) =>
        (s.research_code ?? '').toLowerCase().includes(needle) ||
        (s.name ?? '').toLowerCase().includes(needle) ||
        (s.group_label ?? '').toLowerCase().includes(needle))
    : cache;

  document.querySelector('#tbody').innerHTML = rows.map((s) => `
    <tr class="clickable" onclick="location.hash='#/kind/${esc(kind.id)}/${esc(s.id)}'">
      <td><b>${esc(s.research_code)}</b></td>
      <td>${s.name ? esc(s.name) : '<span class="muted">—</span>'}</td>
      <td>${esc(s.group_label || '—')}</td>
      <td>${esc(sexKo(s.sex))}</td>
      <td class="num">${s.count}</td>
      <td class="num" style="text-align:left">${esc(fmtDate(s.latest, false))}</td>
      <td class="num chev">›</td>
    </tr>`).join('');

  document.querySelector('#hint').textContent =
    needle ? `${rows.length}명 (전체 ${cache.length}명)` : `${cache.length}명`;
}

const sexKo = (s) => ({ male: '남', female: '여', M: '남', F: '여' }[s] ?? (s || '—'));
