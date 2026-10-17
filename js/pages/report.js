// 보고서 한 벌. 앱에서 만든 보고서를 쪽 그림으로 보여 준다.
//
// 웹에서 숫자로 다시 그리지 않는다. 폰과 같은 보고서여야 하고, 두 곳에서
// 따로 그리면 조금씩 다른 말을 하게 된다(`lib/features/report/report_uploader.dart`).
// 사진은 앱이 얼굴을 가려 만든 것이다.

import * as db from '../db.js?v=e568c44';
import { esc, render, loading, errorBox, fmtDate, protocolKo } from '../ui.js?v=e568c44';

export async function reportPage(assessmentId) {
  loading('보고서를 여는 중…');
  let a, pages, urls;
  try {
    a = await db.assessment(assessmentId);
    pages = await db.reportPagesOf([assessmentId]);
    // 보관함이 비공개라 쪽마다 임시 링크(10분)를 받는다.
    urls = await Promise.all(pages.map((p) => db.snapshotUrl(p.path).catch(() => null)));
  } catch (e) {
    return render(errorBox(e));
  }
  if (!a) return render('<div class="empty">그런 측정 기록이 없습니다.</div>');

  const s = a.subjects;

  render(`
    <div class="crumb no-print">
      <a href="#/subjects">대상자</a> ›
      <a href="#/subject/${esc(a.subject_id)}">${esc(s?.research_code ?? '대상자')}</a> ›
      보고서
    </div>
    <div class="page-top no-print">
      <h1>보고서 · ${esc(s?.research_code ?? '')}</h1>
    </div>
    <p class="sub no-print">${esc(fmtDate(a.recorded_at, false))} ${esc(protocolKo(a.protocol))}까지의 보고서입니다. 사진은 얼굴을 가렸습니다.</p>

    ${pages.length === 0 ? `
      <div class="notice notice-info">
        이 측정에는 올라온 보고서가 없습니다. 앱에서 이 날짜의 측정을 올리면 보고서가 함께 올라옵니다.
      </div>` : `
      <div class="report-tools">
        <button class="btn btn-line btn-sm" id="zoom-out" title="작게" aria-label="작게">−</button>
        <span class="zoom-val" id="zoom-val">100%</span>
        <button class="btn btn-line btn-sm" id="zoom-in" title="크게" aria-label="크게">+</button>
        <button class="btn btn-line btn-sm" id="zoom-fit">폭 맞춤</button>
        <span class="muted" style="font-size:13px;margin-left:8px">${pages.length}쪽 · 쪽을 누르면 크게 봅니다</span>
        <span class="gap"></span>
        <button class="btn btn-light btn-sm" id="print">인쇄</button>
      </div>
      <div class="report-scroll">
        <div class="report-pages" id="pages">
          ${pages.map((p, i) => `
            <div class="page-no">${i + 1} / ${pages.length}</div>
            ${urls[i]
              ? `<img class="report-page" src="${esc(urls[i])}" alt="보고서 ${i + 1}쪽">`
              : `<div class="notice notice-error" style="width:100%">${i + 1}쪽을 열지 못했습니다.</div>`}`).join('')}
        </div>
      </div>`}
  `);

  const btn = document.querySelector('#print');
  if (btn) btn.onclick = () => window.print();
  if (pages.length) bindZoom();
}

/**
 * 크게·작게. 1 이 본문 폭에 맞춘 크기다.
 *
 * A4 를 화면 폭에 맞추면 글씨가 작아 읽기 어려운 쪽이 있고(표·각도 그림),
 * 한 쪽 전체를 한눈에 보고 싶을 때도 있다. 둘 다 되게 한다.
 */
const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];

function bindZoom() {
  const box = document.querySelector('#pages');
  const val = document.querySelector('#zoom-val');
  let z = 1;

  const set = (next) => {
    z = next;
    box.style.setProperty('--zoom', String(z));
    box.classList.toggle('zoomed', z > 1);
    val.textContent = `${Math.round(z * 100)}%`;
  };
  const step = (dir) => {
    const i = ZOOMS.findIndex((v) => v >= z - 1e-6);
    const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? ZOOMS.length - 1 : i) + dir))];
    set(next);
  };

  document.querySelector('#zoom-in').onclick = () => step(1);
  document.querySelector('#zoom-out').onclick = () => step(-1);
  document.querySelector('#zoom-fit').onclick = () => set(1);

  // 쪽을 누르면 크게, 다시 누르면 폭 맞춤. 누른 쪽이 화면에 남게 한다.
  box.querySelectorAll('.report-page').forEach((img) => {
    img.onclick = () => {
      set(z > 1 ? 1 : 1.5);
      img.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
  });
}
