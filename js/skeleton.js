// 사진 위에 골격을 겹쳐 그린다.
//
// 앱이 `snapshots.pose_json` 에 넣어 둔 관절 좌표를 쓴다. 좌표는 **원본 이미지
// 픽셀** 기준이라(lib/core/pose/pose_types.dart 의 Landmark), 화면에 맞춰
// 줄여 그려야 한다.
//
// 신뢰도가 낮은 관절은 주황으로 그린다. 숨기면 "안 잡혔다"는 사실까지 숨는다.
// 선생님이 사진을 보며 설명할 때 어디가 덜 잡혔는지 알아야 한다.

const GREEN = '#00D48A';
const ORANGE = '#FF9F40';
const WEAK = 0.5;

/** ML Kit(BlazePose) 33개 랜드마크 순서. 앱의 enum Lm 과 같은 순서다. */
export const LM = [
  'nose',
  'leftEyeInner', 'leftEye', 'leftEyeOuter',
  'rightEyeInner', 'rightEye', 'rightEyeOuter',
  'leftEar', 'rightEar',
  'leftMouth', 'rightMouth',
  'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist',
  'leftPinky', 'rightPinky',
  'leftIndex', 'rightIndex',
  'leftThumb', 'rightThumb',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
  'leftHeel', 'rightHeel',
  'leftFootIndex', 'rightFootIndex',
];

/** 이어 그릴 관절 쌍. 얼굴은 뺀다 — 자세를 보는 데 쓰지 않고, 얼굴을 가려
    올리기로 한 마당에 이목구비를 선으로 되살릴 이유가 없다. */
const BONES = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
  ['leftAnkle', 'leftHeel'], ['leftHeel', 'leftFootIndex'],
  ['rightAnkle', 'rightHeel'], ['rightHeel', 'rightFootIndex'],
];

/**
 * pose_json 을 `{ 이름: {x, y, visibility} }` 로 편다.
 *
 * 앱이 어느 모양으로 넣었는지 아직 확정되지 않았다(업로드를 만들 때 정해진다).
 * 그래서 흔한 세 모양을 다 받는다. 모르는 모양이면 빈 객체를 주고, 화면은
 * 골격 없이 사진만 보여준다 — 그림이 안 그려질 뿐 화면이 깨지지는 않는다.
 */
export function parsePose(poseJson) {
  if (!poseJson) return {};
  const src = typeof poseJson === 'string' ? safeParse(poseJson) : poseJson;
  if (!src) return {};

  // 1) { landmarks: [...] } 또는 [...] — 33개 배열, 순서가 곧 관절 이름
  const arr = Array.isArray(src) ? src : Array.isArray(src.landmarks) ? src.landmarks : null;
  if (arr) {
    const out = {};
    arr.forEach((p, i) => {
      const name = p?.type ?? p?.name ?? LM[i];
      if (!name || p?.x === undefined) return;
      out[name] = { x: +p.x, y: +p.y, v: p.visibility ?? p.v ?? 1 };
    });
    return out;
  }

  // 2) { leftShoulder: {x, y, visibility}, ... }
  if (typeof src === 'object') {
    const out = {};
    for (const [name, p] of Object.entries(src)) {
      if (!p || typeof p !== 'object' || p.x === undefined) continue;
      out[name] = { x: +p.x, y: +p.y, v: p.visibility ?? p.v ?? 1 };
    }
    return out;
  }

  return {};
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * 캔버스에 골격을 그린다.
 *
 * @param canvas  겹쳐 놓을 캔버스
 * @param pose    parsePose 결과
 * @param imgW    원본 이미지 가로(픽셀). 좌표가 이 기준이다.
 * @param imgH    원본 이미지 세로
 */
export function drawSkeleton(canvas, pose, imgW, imgH) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !imgW || !imgH) return;

  // 표시 크기가 아니라 실제 픽셀 수를 맞춰야 선이 뭉개지지 않는다.
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!Object.keys(pose).length) return;

  const sx = canvas.width / imgW;
  const sy = canvas.height / imgH;
  const at = (n) => {
    const p = pose[n];
    return p ? { x: p.x * sx, y: p.y * sy, v: p.v } : null;
  };

  // 선 굵기를 사진 크기에 맞춘다. 작은 사진에 굵은 선을 그으면 관절이 가린다.
  const w = Math.max(1.5, canvas.width / 280);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [a, b] of BONES) {
    const pa = at(a), pb = at(b);
    if (!pa || !pb) continue;
    const weak = pa.v < WEAK || pb.v < WEAK;
    ctx.strokeStyle = weak ? ORANGE : GREEN;
    ctx.globalAlpha = weak ? 0.75 : 0.95;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  // 관절 점은 선 위에 찍는다.
  for (const name of BONES.flat()) {
    const p = at(name);
    if (!p) continue;
    ctx.fillStyle = p.v < WEAK ? ORANGE : GREEN;
    ctx.globalAlpha = p.v < WEAK ? 0.8 : 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, w * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
