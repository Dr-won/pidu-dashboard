// 화면 만들 때 반복되는 것들.

/** HTML 에 값을 끼워 넣기 전에 꼭 거친다. 연구코드나 소속에 <> 가 들어와도
    태그로 읽히지 않게 한다. */
export function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const el = (sel, root = document) => root.querySelector(sel);
export const els = (sel, root = document) => [...root.querySelectorAll(sel)];

export function render(html) {
  const view = el('#view');
  view.innerHTML = html;
  view.scrollTop = 0;
  return view;
}

export const loading = (msg = '불러오는 중…') =>
  render(`<div class="loading">${esc(msg)}</div>`);

/** 서버 오류를 사람이 읽을 말로. 원문도 같이 남긴다 — 숨기면 고칠 수 없다. */
export function errorBox(e) {
  const raw = e?.message ?? String(e);
  let ko = '자료를 불러오지 못했습니다.';
  if (/Failed to fetch|NetworkError/i.test(raw)) ko = '서버에 닿지 못했습니다. 인터넷 연결을 확인해 주세요.';
  else if (/JWT|expired|invalid.*token/i.test(raw)) ko = '로그인이 만료됐습니다. 다시 로그인해 주세요.';
  else if (/permission|denied|policy|row-level/i.test(raw)) ko = '볼 수 있는 권한이 없습니다.';
  return `<div class="notice notice-error">${esc(ko)}<br><span style="opacity:.75;font-size:12.5px">${esc(raw)}</span></div>`;
}

/** 날짜를 짧게. 자료 표에 들어가므로 자리를 적게 쓴다. */
export function fmtDate(iso, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${ymd} ${p(d.getHours())}:${p(d.getMinutes())}` : ymd;
}

/**
 * 측정값 표시. 소수 자리는 단위에 맞춘다.
 *
 * 각도를 소수 넷째 자리까지 보여주면 그만큼 정확한 줄 안다. 카메라 측정은
 * 그 정도가 못 된다.
 */
export function fmtValue(v, unit) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  const digits = unit === 'ratio' ? 3 : unit === 'count' ? 0 : 1;
  return n.toFixed(digits);
}

export const UNIT_KO = {
  deg: '°',
  ratio: '',
  cm: 'cm',
  m: 'm',
  s: '초',
  count: '회',
  'steps/min': '보/분',
  '%': '%',
};

export const unitKo = (u) => UNIT_KO[u] ?? (u ?? '');

/** 품질 등급을 색 딱지로. 앱의 measurement_quality 와 같은 낱말을 쓴다. */
export function qualityTag(level) {
  const map = {
    good: ['tag-good', '양호'],
    fair: ['tag-fair', '보통'],
    poor: ['tag-poor', '미흡'],
    invalid: ['tag-invalid', '무효'],
  };
  const [cls, ko] = map[level] ?? ['tag-unknown', '—'];
  return `<span class="tag ${cls}">${ko}</span>`;
}

/// 앱의 `Protocol` enum 이름 그대로다(lib/core/models/assessment.dart).
/// 이름표도 앱의 `ProtocolX.ko` 와 같은 말을 쓴다 — 같은 측정을 두 화면이
/// 다르게 부르면 쓰는 사람이 다른 것인 줄 안다.
export const PROTOCOL_KO = {
  postureAnterior: '정적자세(서서·정면)',
  postureLateral: '정적자세(서서·측면)',
  posturePosterior: '정적자세(서서·후면)',
  postureAnteriorSeated: '정적자세(앉아서·정면)',
  postureLateralSeated: '정적자세(앉아서·측면)',
  posturePosteriorSeated: '정적자세(앉아서·후면)',
  rom: '관절가동범위',
  gaitAnterior: '보행분석(정면)',
  gaitPosterior: '보행분석(후면)',
  gaitLateral: '보행분석(측면)',
  exercise: '운동수행',
};

export const protocolKo = (p) => PROTOCOL_KO[p] ?? (p ?? '측정');

/** 확인 창. 되돌리기 어려운 일 앞에서만 쓴다. */
export const confirmAsk = (msg) => window.confirm(msg);
