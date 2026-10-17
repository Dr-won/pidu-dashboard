// 첫 화면. 측정 종류 넷 중 하나로 들어간다.
//
// 예전에는 대상자 목록이 첫 화면이었다. 사람을 먼저 고르고 그 안에서 측정을
// 찾는 식인데, 실제로는 "체형분석 기록을 보자"로 시작하는 일이 더 많다
// (사용자 요청 — 앱 첫화면처럼 넷 중 하나를 눌러 들어가고 거기서 사람을
// 고르는 흐름).
//
// 대상자 목록은 없애지 않았다. 위 메뉴에 그대로 있다 — 한 사람의 모든
// 측정을 한자리에서 보는 길은 따로 있어야 한다.

import * as db from '../db.js?v=e568c44';
import { KINDS, kindOf } from '../kinds.js?v=e568c44';
import { esc, render, loading, errorBox } from '../ui.js?v=e568c44';

export async function homePage() {
  loading();

  let counts = new Map();
  let failed = null;
  try {
    counts = await countsByKind();
  } catch (e) {
    // 건수를 못 세어도 입구는 보여 준다. 숫자는 거드는 것이지 길이 아니다.
    failed = e;
  }

  render(`
    <h1>측정 자료</h1>
    <p class="sub">보려는 측정을 고르면 그 측정을 받은 사람이 나옵니다.</p>
    ${failed ? errorBox(failed) : ''}
    <div class="tiles">
      ${KINDS.map((k) => tile(k, counts.get(k.id) ?? 0)).join('')}
    </div>
    ${samples()}
  `);
}

/**
 * 결과지 샘플.
 *
 * 재지 않고도 "어떤 보고서가 나오는지" 볼 데가 필요하다(사용자 요청).
 * 파는 자리에서 보여 주고, 보고서 모양을 다듬을 때도 이것을 띄워 놓고 한다.
 *
 * 파일은 **올릴 때마다 새로 뽑는다**(`tool/release/publish_dashboard.ps1` 이
 * `test/sample_report_kinds_test.dart` 를 돌린다). 앱 설정의 "결과지 샘플
 * 보기"와 같은 생성기라, 보고서 양식을 고치면 앱과 웹이 함께 따라온다.
 * 그래서 저장소에는 두지 않는다 — 올릴 때 만들어 붙인다.
 */
// `SampleKind`(lib/features/report/sample_report.dart)와 짝이다. 거기에
// 갈래를 더하면 여기에도 한 줄 더해야 파일이 생기고도 보이지 않는 일이 없다.
const SAMPLES = [
  ['all', '전체 결과지', '체형 · 보행 · 관절을 모두 잰 한 사람'],
  ['posture', '체형분석', '정면 · 측면 · 후면과 근육 지도'],
  ['postureSeated', '체형분석 (앉아서)', '휠체어 · 의자에서 잰 경우'],
  ['gait', '보행분석', '걸음 균형, 핵심 지표, 좌우 비교'],
  ['motion', '관절가동범위 · 운동', '관절 각도와 지난 4주 운동'],
];

// 이 파일 주소에 붙은 판 번호(`?v=<커밋>`)를 샘플 링크에도 그대로 단다.
//
// 올릴 때 .js/.css 주소에는 판 번호가 붙지만 PDF 에는 붙지 않아, 보고서
// 양식을 고쳐 올려도 브라우저가 들고 있던 옛 PDF 를 그대로 보여 줬다
// (2026-10-15 사용자 지적 — 바뀌지 않았어, 캐시가 있나). 링크가 템플릿
// 문자열이라 올리는 스크립트의 정규식으로는 닿지 않는다.
//
// 따로 안 열면 빈 문자열이라 그냥 `sample/all.pdf` 가 된다.
const VERSION = new URL(import.meta.url).search;

function samples() {
  return `
    <section class="samples">
      <h2>결과지 샘플</h2>
      <p class="sub">지어낸 사람의 측정으로 만든 보기용 보고서입니다. 실제 자료가 아닙니다.</p>
      <div class="sample-list">
        ${SAMPLES.map(
          ([id, title, sub]) => `
          <a class="sample" href="sample/${esc(id)}.pdf${VERSION}" target="_blank" rel="noopener">
            <span class="sample-title">${esc(title)}</span>
            <span class="sample-sub">${esc(sub)}</span>
          </a>`,
        ).join('')}
      </div>
    </section>`;
}

function tile(kind, count) {
  return `
    <a class="tile" href="#/kind/${esc(kind.id)}"
       style="background-image:url('img/home/${esc(kind.id)}.jpg')">
      <div class="tile-text">
        <div class="tile-title">${esc(kind.title)}</div>
        <div class="tile-sub">${esc(kind.sub)}</div>
        <div class="tile-count${count ? '' : ' none'}">
          ${count ? `${count}건` : '아직 없음'}
        </div>
      </div>
      <span class="tile-go">보기</span>
    </a>`;
}

/**
 * 종류별 측정 건수.
 *
 * 종류마다 따로 세면 요청이 네 번 나간다. 한 번에 받아 나눈다. 자료가 아주
 * 많아지면 서버 쪽 view 로 옮기는 편이 낫다(`subjects.js` 도 같은 처지다).
 */
async function countsByKind() {
  const rows = await db.recentAssessments(1000);
  const m = new Map();
  for (const a of rows) {
    const k = kindOf(a.protocol);
    if (k) m.set(k.id, (m.get(k.id) ?? 0) + 1);
  }
  return m;
}
