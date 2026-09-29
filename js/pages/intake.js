// 접수코드 관리. 사진 접수 링크(upload.html)를 쓸 수 있게 하는 열쇠다.
//
// 코드를 만들려고 SQL 을 치게 두면 행사마다 사람을 부르게 된다. 여기서
// 이름 적고 누르면 만들어지고, 끝난 행사는 스위치로 끈다.
//
// 코드는 **보관함 경로의 첫 칸**이 된다. 보관함이 한글 경로를 거부하므로
// (Invalid key) 영문·숫자만 받는다.

import * as db from '../db.js?v=432fda0';
import { esc, render, loading, errorBox, fmtDate, confirmAsk } from '../ui.js?v=432fda0';

const UPLOAD_URL = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}upload.html`;

export async function intakePage() {
  loading();
  let codes;
  try {
    codes = await db.intakeCodes();
  } catch (e) {
    return render(`<h1>사진 접수</h1>${errorBox(e)}`);
  }

  let waiting = [];
  try {
    waiting = await db.intakeWaiting();
  } catch { /* 코드가 하나도 없으면 비어 있는 게 맞다 */ }

  render(`
    <h1>사진 접수</h1>
    <p class="sub">
      대상자에게 링크와 접수코드를 알려 주면, 계정 없이 사진과 키·성별을 보낼 수 있습니다.
      올라온 것은 PC 에서 내려받아 분석합니다.
    </p>

    <div class="card">
      <div class="row">
        <div class="row-main">
          <div class="row-title">접수 링크</div>
          <div class="row-sub"><code>${esc(UPLOAD_URL)}</code></div>
        </div>
        <button class="btn btn-line btn-sm" id="copy-link">주소 복사</button>
      </div>
    </div>

    <h2>새 접수코드</h2>
    <div class="card">
      <div class="field">
        <label for="new-code">코드 (영문·숫자)</label>
        <input type="text" id="new-code" placeholder="school2026"
               autocapitalize="off" spellcheck="false">
      </div>
      <div class="field">
        <label for="new-label">무엇을 위한 것인지</label>
        <input type="text" id="new-label" placeholder="2026 학교 체형검진">
      </div>
      <button class="btn" id="make" style="width:100%">만들기</button>
    </div>

    <h2>기다리는 자료 ${waiting.length}건</h2>
    <div class="card">
      ${waiting.length === 0
        ? '<span style="color:var(--muted)">아직 올라온 것이 없습니다.</span>'
        : waiting.map(waitRow).join('')}
    </div>

    <h2>접수코드 ${codes.length}개</h2>
    ${codes.length === 0
      ? '<div class="card"><span style="color:var(--muted)">아직 없습니다.</span></div>'
      : codes.map(codeCard).join('')}
  `);

  bind();
}

const waitRow = (r) => `
  <div class="row">
    <div class="row-main">
      <div class="row-title">${esc(r.name)}</div>
      <div class="row-sub">
        ${esc(r.code)} · ${esc((r.views || []).map(viewKo).join('·') || '사진 없음')}
        · ${esc(fmtDate(r.created_at, false))}
      </div>
    </div>
  </div>`;

const viewKo = (v) => ({ anterior: '정면', lateral: '측면', posterior: '후면' }[v] ?? v);

const codeCard = (c) => `
  <div class="card">
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(c.code)}${c.active ? '' : ' · 꺼짐'}</div>
        <div class="row-sub">
          ${esc(c.label || '설명 없음')} · 만든 날 ${esc(fmtDate(c.created_at, false))}
        </div>
      </div>
      <button class="btn btn-line btn-sm" data-copy="${esc(c.code)}">안내문 복사</button>
      <button class="btn btn-line btn-sm" data-toggle="${esc(c.code)}" data-on="${c.active ? '1' : '0'}">
        ${c.active ? '끄기' : '켜기'}
      </button>
    </div>
  </div>`;

function bind() {
  document.getElementById('make').onclick = make;

  document.getElementById('copy-link').onclick = () => copy(UPLOAD_URL, '주소를 복사했습니다.');

  document.querySelectorAll('[data-copy]').forEach((b) => {
    b.onclick = () => copy(
      // 대상자에게 그대로 보낼 수 있는 문장. 링크만 보내면 코드를 따로 묻는다.
      `체형측정 사진을 아래 주소로 보내 주세요.\n\n${UPLOAD_URL}\n\n접수코드: ${b.dataset.copy}\n\n` +
      '정면·측면·후면 세 장을 2~3m 떨어져 온몸이 다 나오게 찍어 주세요. 키를 꼭 적어 주세요.',
      '안내문을 복사했습니다. 그대로 보내시면 됩니다.',
    );
  });

  document.querySelectorAll('[data-toggle]').forEach((b) => {
    b.onclick = () => toggle(b.dataset.toggle, b.dataset.on === '1');
  });
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    alert(done);
  } catch {
    // 브라우저가 막으면 사람이 직접 고르게 보여 준다.
    window.prompt('복사해서 쓰세요', text);
  }
}

async function make() {
  const code = document.getElementById('new-code').value.trim();
  const label = document.getElementById('new-label').value.trim();

  if (!/^[A-Za-z0-9._-]+$/.test(code)) {
    return alert('코드는 영문과 숫자로 적어 주세요.\n사진 보관함이 한글 경로를 받지 않습니다.');
  }

  try {
    await db.addIntakeCode(code, label || null);
    await intakePage();
  } catch (e) {
    const msg = String(e?.message ?? e);
    alert(/duplicate|unique/i.test(msg)
      ? '이미 있는 코드입니다.'
      : `만들지 못했습니다.\n${msg}`);
  }
}

async function toggle(code, on) {
  if (on && !confirmAsk(`${code} 를 끕니다.\n이 코드로는 더 올릴 수 없습니다. 이미 올라온 것은 그대로 남습니다.`)) {
    return;
  }
  try {
    await db.setIntakeCodeActive(code, !on);
    await intakePage();
  } catch (e) {
    alert(`바꾸지 못했습니다.\n${e?.message ?? e}`);
  }
}
