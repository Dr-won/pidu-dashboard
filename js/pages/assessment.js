// 측정 한 건. 사진과 골격, 지표 표, 촬영 조건.
//
// 이 화면이 웹 대시보드를 만든 이유다. 대상자 앞에서 사진을 띄워 놓고
// "여기 어깨가 이만큼 기울었다"고 보여 주는 자리다. 숫자만으로는 설명이
// 안 된다(docs/web_dashboard_plan.md).

import * as db from '../db.js?v=432fda0';
import {
  esc, render, loading, errorBox, fmtDate, fmtValue, unitKo, qualityTag,
  protocolKo, PROTOCOL_KO,
} from '../ui.js?v=432fda0';
import { metricName } from '../metric_names.js?v=432fda0';
import { parsePose, drawSkeleton } from '../skeleton.js?v=432fda0';
import { toLongCsv, download, stamp } from '../csv.js?v=432fda0';

export async function assessmentPage(id) {
  loading();
  let a, measurements, snaps, hasReport;
  try {
    a = await db.assessment(id);
    if (!a) return render('<div class="empty">그런 측정 기록이 없습니다.</div>');
    let all;
    [measurements, all] = await Promise.all([
      db.measurementsOf(id),
      db.snapshotsOf(id),
    ]);
    // 보고서 쪽 그림은 사진이 아니다. 사진 칸에 섞으면 골격 없는 A4 가 뜬다.
    snaps = all.filter((s) => !db.isReportPage(s));
    hasReport = all.some(db.isReportPage);
  } catch (e) {
    return render(errorBox(e));
  }

  const s = a.subjects;

  render(`
    <div class="crumb">
      <a href="#/subjects">대상자</a> ›
      <a href="#/subject/${esc(a.subject_id)}">${esc(s?.research_code ?? '대상자')}</a> ›
      ${esc(protocolKo(a.protocol))}
    </div>

    <div class="row" style="margin-bottom:4px">
      <h1 style="flex:1">${esc(protocolKo(a.protocol))}</h1>
      ${hasReport ? `<a class="btn btn-sm" href="#/report/${esc(a.id)}" style="margin-right:6px">보고서 보기</a>` : ''}
      <button class="btn btn-line btn-sm" id="csv">CSV 내려받기</button>
    </div>
    <p class="sub">${esc(fmtDate(a.recorded_at))}${a.rater_code ? ' · 측정자 ' + esc(a.rater_code) : ''}</p>

    ${a.note ? `<div class="notice notice-info">${esc(a.note)}</div>` : ''}

    <h2>사진</h2>
    <div id="shots">${snaps.length ? '<div class="loading">사진을 여는 중…</div>' : noShots()}</div>

    <h2>측정값 ${measurements.length}개</h2>
    ${measurements.length ? measureTable(measurements) : '<div class="card"><span style="color:var(--muted)">측정값이 없습니다.</span></div>'}

    <h2>촬영 조건</h2>
    ${conditions(a)}
  `);

  document.querySelector('#csv').onclick = () =>
    download(
      `pidu_${s?.research_code ?? 'assessment'}_${stamp()}.csv`,
      toLongCsv([{ subject: s, assessment: a, measurements }]),
    );

  if (snaps.length) showShots(snaps, a);
}

const noShots = () => `
  <div class="notice notice-info">
    이 측정에는 사진이 없습니다. 앱에 사진 올리기가 아직 붙지 않았거나,
    사진 없이 저장한 측정입니다.
  </div>`;

function measureTable(rows) {
  // 같은 지표를 여러 차수 잰 경우가 있다. 지표별로 묶어 차수를 나란히 둔다.
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr>
          <th>지표</th><th class="num">값</th><th>단위</th>
          <th class="num">차수</th><th>품질</th><th>지적 사항</th>
        </tr></thead>
        <tbody>${rows.map((m) => `
          <tr>
            <td>${esc(metricName(m.metric_key))}</td>
            <td class="num"><b>${esc(fmtValue(m.value, m.unit))}</b></td>
            <td style="color:var(--muted)">${esc(unitKo(m.unit) || m.unit || '')}</td>
            <td class="num">${esc(m.trial ?? 1)}</td>
            <td>${qualityTag(m.quality_level)}</td>
            <td style="color:var(--muted);font-size:13px">${esc(issuesKo(m.quality_issues))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/** 품질 지적 사항. 앱이 `|` 로 이어 붙여 저장한다. */
function issuesKo(raw) {
  if (!raw) return '';
  const ko = {
    lowVisibility: '관절이 덜 보임',
    highJitter: '흔들림 큼',
    trunkRotated: '몸통이 돌아감',
    tooFewFrames: '프레임 부족',
    outOfFrame: '화면 밖으로 나감',
    partialBody: '몸 일부만 잡힘',
  };
  return String(raw).split('|').filter(Boolean).map((k) => ko[k] ?? k).join(', ');
}

function conditions(a) {
  const items = [
    ['카메라 거리', a.camera_distance_cm ? `${a.camera_distance_cm} cm` : null],
    ['카메라 높이', a.camera_height_cm ? `${a.camera_height_cm} cm` : null],
    ['카메라', a.front_camera === null || a.front_camera === undefined ? null : (a.front_camera ? '전면' : '후면')],
    ['이미지 크기', a.image_width && a.image_height ? `${a.image_width} × ${a.image_height}` : null],
    ['자세 모델', a.pose_model_version],
    ['앱 버전', a.app_version],
    ['기기', a.device_model],
    ['보행 지면', a.gait_surface],
    ['보행 속도', a.gait_speed_kmh ? `${a.gait_speed_kmh} km/h` : null],
    ['손잡이', a.gait_handrail === null || a.gait_handrail === undefined ? null : (a.gait_handrail ? '사용' : '미사용')],
  ].filter(([, v]) => v);

  if (!items.length) {
    return '<div class="card"><span style="color:var(--muted)">기록된 조건이 없습니다.</span></div>';
  }

  return `<div class="grid">${items.map(([k, v]) => `
    <div class="stat">
      <div style="font-size:16px;font-weight:600">${esc(v)}</div>
      <div class="stat-label">${esc(k)}</div>
    </div>`).join('')}</div>`;
}

/**
 * 사진을 열고 골격을 겹친다.
 *
 * 보관함이 비공개라 임시 링크를 하나씩 받아야 한다(10분 만료). 링크를 다 받은
 * 뒤에 한꺼번에 그린다.
 */
async function showShots(snaps, a) {
  const box = document.querySelector('#shots');

  let urls;
  try {
    urls = await Promise.all(snaps.map((s) => db.snapshotUrl(s.path).catch(() => null)));
  } catch (e) {
    box.innerHTML = errorBox(e);
    return;
  }

  box.className = 'shots';
  box.innerHTML = snaps.map((s, i) => {
    const url = urls[i];
    if (!url) {
      return `<div class="notice notice-error">사진을 열지 못했습니다.<br>
        <span style="font-size:12.5px;opacity:.75">${esc(s.path)}</span></div>`;
    }
    return `
      <div>
        <div class="shot">
          <img src="${esc(url)}" alt="측정 사진" data-i="${i}">
          <canvas data-canvas="${i}"></canvas>
        </div>
        <div class="shot-bar">
          <span>${esc(viewKo(s.path))}</span>
          <span style="flex:1"></span>
          ${s.face_blurred
            ? '<span class="tag tag-good">얼굴 가림</span>'
            : '<span class="tag tag-fair">얼굴 그대로</span>'}
          <a class="btn btn-line btn-sm" href="${esc(url)}" target="_blank" rel="noopener">원본 열기</a>
        </div>
      </div>`;
  }).join('');

  // 사진이 실제로 뜬 뒤라야 캔버스 크기를 알 수 있다.
  box.querySelectorAll('img[data-i]').forEach((img) => {
    const i = Number(img.dataset.i);
    const canvas = box.querySelector(`canvas[data-canvas="${i}"]`);
    const pose = parsePose(snaps[i].pose_json);

    // 좌표 기준이 되는 원본 크기. 세션에 적힌 값을 먼저 쓰고, 없으면 사진
    // 자체의 크기를 쓴다.
    const draw = () => drawSkeleton(
      canvas, pose,
      a.image_width || img.naturalWidth,
      a.image_height || img.naturalHeight,
    );

    if (img.complete) draw(); else img.onload = draw;
    // 창 크기가 바뀌면 캔버스 픽셀 수가 달라져 다시 그려야 한다.
    window.addEventListener('resize', draw, { passive: true });
  });
}

/**
 * 파일 이름에서 무엇을 찍은 것인지 읽는다.
 *
 * 경로 규칙: `<uid>/<assessment_id>/<view>.png`. 앱이 측정 종류를 그대로
 * 파일 이름에 쓴다(`postureLateral.png` 처럼). 그래서 측정 종류 이름표를
 * 먼저 찾고, 없으면 방향 이름표를 본다.
 */
function viewKo(path) {
  const file = String(path).split('/').pop() ?? '';
  const name = file.replace(/\.(jpe?g|png)$/i, '');
  return PROTOCOL_KO[name]
    ?? ({
      front: '정면', back: '후면', side: '측면',
      left: '좌측', right: '우측',
      sit_front: '앉은 정면', sit_side: '앉은 측면',
    }[name])
    ?? name;
}
