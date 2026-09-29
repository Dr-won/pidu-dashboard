// 한 대상자의 측정 기록 목록과 지표 추이.
//
// 같은 지표를 여러 번 잰 것이 이 화면의 핵심이다. 한 번 잰 값만 보면 그게
// 좋은지 나쁜지 알 수 없지만, 같은 사람을 두 달 간격으로 잰 값이 나란히
// 있으면 나아졌는지 알 수 있다.

import * as db from '../db.js?v=432fda0';
import {
  esc, render, loading, errorBox, fmtDate, fmtValue, unitKo, protocolKo,
} from '../ui.js?v=432fda0';
import { metricName } from '../metric_names.js?v=432fda0';
import { toLongCsv, download, stamp } from '../csv.js?v=432fda0';

export async function subjectPage(id) {
  loading();
  let s, list, withReport;
  try {
    [s, list] = await Promise.all([db.subject(id), db.assessmentsOf(id)]);
    // 보고서가 붙은 측정. 앱이 그날 가장 늦게 잰 측정에 붙인다.
    const pages = await db.reportPagesOf(list.map((a) => a.id)).catch(() => []);
    withReport = new Set(pages.map((p) => p.assessment_id));
  } catch (e) {
    return render(errorBox(e));
  }
  if (!s) return render('<div class="empty">그런 대상자가 없습니다.</div>');

  const latestReport = list.find((a) => withReport.has(a.id));

  render(`
    <div class="crumb"><a href="#/subjects">대상자</a> › ${esc(s.research_code)}</div>
    <h1>${esc(s.research_code)}</h1>
    <p class="sub">${esc(infoLine(s))}</p>

    ${s.consent_at ? '' : `
      <div class="notice notice-error">
        <b>동의 확인일이 없습니다.</b> 자료 수집·이용 동의를 받은 기록이 없는 대상자입니다.
        연구에 쓰기 전에 확인해 주세요.
      </div>`}

    ${latestReport ? `
      <div class="card row" style="margin-top:14px">
        <div class="row-main">
          <div class="row-title">최근 보고서</div>
          <div class="row-sub">${esc(fmtDate(latestReport.recorded_at, false))} · 앱에서 만든 보고서와 같습니다</div>
        </div>
        <a class="btn" href="#/report/${esc(latestReport.id)}">보고서 보기</a>
      </div>` : ''}

    <div class="row" style="margin:18px 0 10px">
      <h2 style="margin:0;flex:1">측정 기록 ${list.length}건</h2>
      ${list.length ? '<button class="btn btn-line btn-sm" id="csv">전체 CSV 내려받기</button>' : ''}
    </div>

    ${list.length === 0
      ? '<div class="card"><span style="color:var(--muted)">아직 측정 기록이 없습니다.</span></div>'
      : `<div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr><th>측정</th><th>측정일시</th><th>측정자</th><th>기기</th><th>보고서</th><th></th></tr></thead>
            <tbody>${list.map((a) => rowHtml(a, withReport.has(a.id))).join('')}</tbody>
          </table>
        </div>`}

    <div id="trend"></div>
  `);

  if (!list.length) return;

  document.querySelector('#csv').onclick = (ev) => exportAll(ev.currentTarget, s, list);
  drawTrend(s, list);
}

function infoLine(s) {
  const bits = [
    s.group_label,
    { male: '남', female: '여', M: '남', F: '여' }[s.sex] ?? s.sex,
    s.birth_year ? `${s.birth_year}년생` : null,
    s.height_cm ? `${s.height_cm} cm` : null,
    s.weight_kg ? `${s.weight_kg} kg` : null,
    s.consent_at ? `동의 확인 ${fmtDate(s.consent_at, false)}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : '추가 정보 없음';
}

const rowHtml = (a, hasReport) => `
  <tr class="clickable" onclick="location.hash='#/assessment/${esc(a.id)}'">
    <td><b>${esc(protocolKo(a.protocol))}</b></td>
    <td>${esc(fmtDate(a.recorded_at))}</td>
    <td>${esc(a.rater_code || '—')}</td>
    <td>${esc(a.device_model || '—')}</td>
    <td>${hasReport
      // 줄 전체가 측정 화면으로 가므로, 보고서 단추는 그 클릭을 막는다.
      ? `<a class="btn btn-line btn-sm" href="#/report/${esc(a.id)}" onclick="event.stopPropagation()">보고서</a>`
      : ''}</td>
    <td class="num" style="color:var(--muted)">›</td>
  </tr>`;

/**
 * 두 번 이상 잰 지표만 골라 시간순으로 보여 준다.
 *
 * 한 번만 잰 지표를 추이라고 내놓으면 점 하나짜리 표가 된다. 볼 것이 없다.
 */
async function drawTrend(subject, list) {
  const box = document.querySelector('#trend');
  box.innerHTML = '<h2>지표 추이</h2><div class="loading">모으는 중…</div>';

  let sets;
  try {
    sets = await Promise.all(list.map((a) => db.measurementsOf(a.id)));
  } catch (e) {
    box.innerHTML = '<h2>지표 추이</h2>' + errorBox(e);
    return;
  }

  // metric_key → [{ when, value, unit, quality }]
  const byMetric = new Map();
  list.forEach((a, i) => {
    for (const m of sets[i]) {
      if (m.trial !== 1 && m.trial != null) continue; // 대표값만. 반복 차수는 상세 화면에서 본다.
      if (!byMetric.has(m.metric_key)) byMetric.set(m.metric_key, []);
      byMetric.get(m.metric_key).push({
        when: a.recorded_at, value: m.value, unit: m.unit, quality: m.quality_level,
      });
    }
  });

  const repeated = [...byMetric.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([k, v]) => [k, v.sort((a, b) => new Date(a.when) - new Date(b.when))]);

  if (!repeated.length) {
    box.innerHTML = `<h2>지표 추이</h2>
      <div class="card"><span style="color:var(--muted)">
        두 번 이상 잰 지표가 아직 없습니다. 같은 지표를 다시 재면 여기서 변화를 볼 수 있습니다.
      </span></div>`;
    return;
  }

  box.innerHTML = `
    <h2>지표 추이 <span style="font-weight:400;color:var(--muted);font-size:14px">두 번 이상 잰 것만</span></h2>
    <div class="card" style="padding:0;overflow:auto">
      <table>
        <thead><tr>
          <th>지표</th>
          ${repeated[0][1].map((p) => `<th class="num">${esc(fmtDate(p.when, false))}</th>`).join('')}
          <th class="num">변화</th>
        </tr></thead>
        <tbody>${repeated.map(([key, pts]) => trendRow(key, pts, repeated[0][1].length)).join('')}</tbody>
      </table>
    </div>
    <p class="sub" style="margin-top:10px">
      변화는 처음 잰 값과 마지막 값의 차이입니다. 측정 조건(거리·높이·카메라)이 다르면
      값도 달라지므로, 조건이 같은 측정끼리 비교해야 합니다.
    </p>`;
}

function trendRow(key, pts, cols) {
  const unit = pts[0].unit;
  const diff = Number(pts.at(-1).value) - Number(pts[0].value);
  const sign = diff > 0 ? '+' : '';

  const cells = [];
  for (let i = 0; i < cols; i++) {
    const p = pts[i];
    cells.push(p
      ? `<td class="num">${esc(fmtValue(p.value, p.unit))}${esc(unitKo(p.unit))}</td>`
      : '<td class="num">—</td>');
  }

  return `<tr>
    <td>${esc(metricName(key))}</td>
    ${cells.join('')}
    <td class="num" style="color:${Math.abs(diff) < 1e-9 ? 'var(--muted)' : 'inherit'}">
      ${esc(sign + fmtValue(diff, unit))}${esc(unitKo(unit))}
    </td>
  </tr>`;
}

async function exportAll(btn, subject, list) {
  btn.disabled = true;
  btn.textContent = '모으는 중…';
  try {
    const sets = await Promise.all(list.map((a) => db.measurementsOf(a.id)));
    const records = list.map((a, i) => ({ subject, assessment: a, measurements: sets[i] }));
    download(`pidu_${subject.research_code}_${stamp()}.csv`, toLongCsv(records));
  } catch (e) {
    alert(`내려받지 못했습니다.\n${e?.message ?? e}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '전체 CSV 내려받기';
  }
}
