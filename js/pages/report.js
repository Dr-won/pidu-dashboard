// 보고서 한 벌. 앱에서 만든 보고서를 쪽 그림으로 보여 준다.
//
// 웹에서 숫자로 다시 그리지 않는다. 폰과 같은 보고서여야 하고, 두 곳에서
// 따로 그리면 조금씩 다른 말을 하게 된다(`lib/features/report/report_uploader.dart`).
// 사진은 앱이 얼굴을 가려 만든 것이다.

import * as db from '../db.js?v=432fda0';
import { esc, render, loading, errorBox, fmtDate, protocolKo } from '../ui.js?v=432fda0';

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
    <div class="row no-print" style="margin-bottom:12px">
      <h1 style="flex:1">보고서 · ${esc(s?.research_code ?? '')}</h1>
      ${pages.length ? '<button class="btn btn-line btn-sm" id="print">인쇄</button>' : ''}
    </div>
    <p class="sub no-print">${esc(fmtDate(a.recorded_at, false))} ${esc(protocolKo(a.protocol))}까지의 보고서입니다. 사진은 얼굴을 가렸습니다.</p>

    ${pages.length === 0 ? `
      <div class="notice notice-info">
        이 측정에는 올라온 보고서가 없습니다. 앱에서 이 날짜의 측정을 올리면 보고서가 함께 올라옵니다.
      </div>` : `
      <div class="report-pages">
        ${pages.map((p, i) => urls[i]
          ? `<img class="report-page" src="${esc(urls[i])}" alt="보고서 ${i + 1}쪽">`
          : `<div class="notice notice-error">${i + 1}쪽을 열지 못했습니다.</div>`).join('')}
      </div>`}
  `);

  const btn = document.querySelector('#print');
  if (btn) btn.onclick = () => window.print();
}
