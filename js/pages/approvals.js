// 측정자 승인. 앱의 lib/features/account/approvals_screen.dart 와 같은 일을 한다.
//
// 맥미니 앞에 앉아 있지 않아도 승인할 수 있게 하려고 만들었다. 두 화면 중
// 아무 쪽에서나 승인해도 결과는 같다 — 판단은 서버가 한다.

import * as db from '../db.js?v=432fda0';
import { esc, render, loading, errorBox, fmtDate, confirmAsk } from '../ui.js?v=432fda0';

export async function approvalsPage() {
  loading();
  let pending, decided;
  try {
    [pending, decided] = await Promise.all([db.pendingRaters(), db.decidedRaters()]);
  } catch (e) {
    return render(`<h1>측정자 승인</h1>${errorBox(e)}`);
  }

  render(`
    <h1>측정자 승인</h1>
    <p class="sub">승인한 사람만 측정 자료를 올릴 수 있습니다. 승인 전에도 앱에서 측정과 저장은 됩니다.</p>

    <h2>승인 대기 ${pending.length}명</h2>
    ${pending.length === 0
      ? '<div class="card"><span style="color:var(--muted)">기다리는 사람이 없습니다.</span></div>'
      : pending.map(pendingCard).join('')}

    <h2>처리한 사람</h2>
    ${decided.length === 0
      ? '<div class="card"><span style="color:var(--muted)">아직 없습니다.</span></div>'
      : decided.map(decidedCard).join('')}
  `);

  bind();
}

const pendingCard = (p) => `
  <div class="card">
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(p.display_name)}</div>
        <div class="row-sub">${esc(p.affiliation || '소속 없음')} · 요청 ${esc(fmtDate(p.requested_at, false))}</div>
      </div>
      <button class="btn btn-line btn-sm" data-reject="${esc(p.id)}" data-was="0">거절</button>
      <button class="btn btn-sm" data-approve="${esc(p.id)}" data-name="${esc(p.display_name)}">승인</button>
    </div>
  </div>`;

function decidedCard(p) {
  const approved = p.status === 'approved';
  const bits = [p.display_name, p.rater_code, p.role === 'admin' ? '관리자' : null]
    .filter(Boolean).join(' · ');
  return `
  <div class="card">
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(bits)}</div>
        <div class="row-sub">
          ${approved ? '승인됨' : '거절·차단됨'}
          ${p.decided_at ? ' · ' + esc(fmtDate(p.decided_at, false)) : ''}
        </div>
      </div>
      ${approved
        ? `<button class="btn btn-line btn-sm" data-reject="${esc(p.id)}" data-was="1">막기</button>`
        : `<button class="btn btn-line btn-sm" data-approve="${esc(p.id)}" data-name="${esc(p.display_name)}">승인</button>`}
    </div>
  </div>`;
}

function bind() {
  document.querySelectorAll('[data-approve]').forEach((b) => {
    b.onclick = () => approve(b.dataset.approve, b.dataset.name);
  });
  document.querySelectorAll('[data-reject]').forEach((b) => {
    b.onclick = () => reject(b.dataset.reject, b.dataset.was === '1');
  });
}

/**
 * 승인하면서 측정자 코드를 준다.
 *
 * 코드를 사람이 맨손으로 정하면 겹치거나 규칙이 흐트러진다. 다음 번호를
 * 미리 채워 주고, 바꾸고 싶으면 바꾸게 한다(앱과 같은 방식).
 */
async function approve(id, name) {
  let suggested = 'S01';
  try { suggested = await db.nextRaterCode(); } catch { /* 제안일 뿐이라 실패해도 진행한다 */ }

  const code = window.prompt(
    `${name} 승인\n\n` +
    '측정자 코드를 줍니다. 이 사람이 잰 자료와 대상자 연구코드 앞에 붙어,\n' +
    '나중에 누가 쟀는지 알 수 있습니다.',
    suggested,
  );
  if (code === null) return;

  const trimmed = code.trim();
  if (!trimmed) return;

  try {
    await db.approveRater(id, trimmed);
    await approvalsPage();
  } catch (e) {
    const msg = String(e?.message ?? e);
    alert(/duplicate|unique/i.test(msg)
      ? '이미 쓰고 있는 코드입니다. 다른 코드를 주세요.'
      : `승인하지 못했습니다.\n${msg}`);
  }
}

async function reject(id, wasApproved) {
  const ok = confirmAsk(wasApproved
    ? '이 사람이 더는 자료를 올리지 못하게 합니다.\n이미 올라온 자료는 그대로 남습니다.'
    : '가입 요청을 거절합니다.\n나중에 다시 승인할 수 있습니다.');
  if (!ok) return;

  try {
    await db.rejectRater(id);
    await approvalsPage();
  } catch (e) {
    alert(`처리하지 못했습니다.\n${e?.message ?? e}`);
  }
}
