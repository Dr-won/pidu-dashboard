// 측정 종류 네 가지. 앱 첫화면의 띠 넷과 같은 구분이다.
//
// 서버의 `assessments.protocol` 은 열한 가지다(lib/core/models/assessment.dart).
// 정면·측면·후면과 선 자세·앉은 자세를 나눠 두어 분석할 때 섞이지 않게 한
// 것인데, 자료를 **찾아 들어갈 때**는 그 열한 가지가 그대로 보일 필요가 없다.
// 사람은 "체형분석 기록"을 찾지 "정적자세(앉아서·후면)"를 찾지 않는다.
//
// 그래서 보는 쪽에서만 넷으로 묶는다. 저장된 값은 건드리지 않는다.

export const KINDS = [
  {
    id: 'posture',
    title: '체형분석',
    sub: '정면 · 측면 · 후면',
    protocols: [
      'postureAnterior',
      'postureLateral',
      'posturePosterior',
      'postureAnteriorSeated',
      'postureLateralSeated',
      'posturePosteriorSeated',
    ],
  },
  {
    id: 'gait',
    title: '보행분석',
    sub: '트레드밀 · 지면보행',
    protocols: ['gaitAnterior', 'gaitPosterior', 'gaitLateral'],
  },
  {
    id: 'exercise',
    title: '운동',
    sub: '횟수 · 자세 판정',
    protocols: ['exercise'],
  },
  {
    id: 'rom',
    title: '관절가동범위',
    sub: '어깨 · 무릎 · 고관절',
    protocols: ['rom'],
  },
];

export const kindById = (id) => KINDS.find((k) => k.id === id) ?? null;

/** 측정 하나가 어느 종류인지. 모르는 protocol 이면 null. */
export function kindOf(protocol) {
  return KINDS.find((k) => k.protocols.includes(protocol)) ?? null;
}
