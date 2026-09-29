// 지표 키를 한국어 이름으로. 앱의 lib/features/records/metric_names.dart 와
// 같은 규칙을 따른다.
//
// **못 찾으면 키를 그대로 보여준다.** 앱에서 이미 겪은 일이다 — 이름을 못 찾은
// 값을 화면에서 지웠더니, 저장은 됐는데 안 보이니까 검사자가 "측정이 안 됐다"고
// 판단하고 다시 찍었다. 낯선 키가 보이는 편이 사라지는 것보다 낫다.
//
// 앱에 지표가 늘면 여기도 늘려야 한다. 안 늘려도 키로 보일 뿐 깨지지는 않는다.

const POSTURE = {
  head_tilt: '머리 기울기',
  shoulder_tilt: '어깨 기울기',
  pelvic_obliquity: '골반 기울기',
  lateral_shift: '체간 좌우 편위',
  knee_alignment_left: '좌측 무릎 정렬각',
  knee_alignment_right: '우측 무릎 정렬각',
  cva: '두개척추각(근사)',
  forward_shoulder: '어깨 전방 이동',
  trunk_lean: '체간 전후 기울기',
  trunk_thigh_angle: '체간-대퇴 각',
  seated_knee_angle: '무릎 굽힘각 (좌위)',
};

const GAIT = {
  gait_step_width: '발 간격',
  gait_cadence: '케이던스',
  gait_pelvic_obliquity_range: '골반 동요 폭',
  gait_pelvic_drop_left: '좌측 골반 하강',
  gait_pelvic_drop_right: '우측 골반 하강',
  gait_trunk_sway_range: '체간 좌우 동요 폭',
  gait_asymmetry_index: '좌우 비대칭 지수',
  gait_step_length: '보폭 길이',
  gait_knee_flexion_max: '최대 무릎 굽힘',
  gait_knee_extension_min: '최소 무릎 굽힘',
  gait_hip_rom: '고관절 굴신 범위',
  gait_trunk_forward_lean: '체간 전방 기울기',
};

const ROM = {
  rom_shoulder_flexion: ['어깨', '굴곡(앞으로 올리기)'],
  rom_shoulder_extension: ['어깨', '신전(뒤로 보내기)'],
  rom_shoulder_abduction: ['어깨', '외전(옆으로 올리기)'],
  rom_shoulder_internal_rotation: ['어깨', '내회전'],
  rom_shoulder_external_rotation: ['어깨', '외회전'],
  rom_elbow_flexion: ['팔꿈치', '굴곡'],
  rom_hip_flexion: ['고관절', '굴곡'],
  rom_hip_abduction: ['고관절', '외전'],
  rom_knee_flexion: ['무릎', '굴곡'],
  rom_ankle_dorsiflexion: ['발목', '배측굴곡'],
  rom_trunk_flexion: ['체간', '굴곡(앞으로 숙이기)'],
  rom_trunk_lateral_flexion: ['체간', '측방굴곡(옆으로 기울이기)'],
  rom_cervical_rotation: ['경추', '회전'],
};

const EXERCISE = {
  squat: '스쿼트',
  sit_to_stand: '앉았다 일어서기',
  elbow_curl: '팔꿈치 굽히기',
  shoulder_abduction: '어깨 벌리기',
};

const EXERCISE_METRIC = {
  rep_count: '반복 횟수',
  aborted_attempts: '깊이 미달 시도',
  duration: '세트 시간',
  rom_mean: '평균 가동범위',
  depth_best: '최고 도달 각도',
  rep_time_mean: '1회 평균 시간',
};

/** 키 끝의 `_left` / `_right` 를 떼어 낸다. 없으면 두 번째 값이 null. */
function splitSide(key) {
  if (key.endsWith('_left')) return [key.slice(0, -5), '좌측'];
  if (key.endsWith('_right')) return [key.slice(0, -6), '우측'];
  return [key, null];
}

function romName(key) {
  if (!key.startsWith('rom_')) return null;

  let rest = key;
  // 각도계로 잰 값임을 이름에 남긴다. 카메라 측정과 섞이면 두 방법의 값을
  // 한 변수로 다루게 된다.
  const manual = rest.endsWith('_manual');
  if (manual) rest = rest.slice(0, -'_manual'.length);

  const [base, sideKo] = splitSide(rest);
  if (!sideKo) return null;

  const item = ROM[base];
  if (!item) return null;

  return `${item[0]} ${item[1]} · ${sideKo}${manual ? ' · 각도계' : ''}`;
}

function exerciseName(key) {
  if (!key.startsWith('ex_')) return null;

  const [body, sideKo] = splitSide(key.slice(3));
  if (!sideKo) return null;

  for (const [exKey, nameKo] of Object.entries(EXERCISE)) {
    if (!body.startsWith(exKey + '_')) continue;
    const ko = EXERCISE_METRIC[body.slice(exKey.length + 1)];
    if (!ko) return null;
    return `${nameKo} ${ko} · ${sideKo}`;
  }
  return null;
}

export function metricName(key) {
  return POSTURE[key]
    ?? GAIT[key]
    ?? romName(key)
    ?? exerciseName(key)
    ?? key;
}

/** 이름을 아는 키인지. 자료가 이상할 때 짚어 보는 용도다. */
export const isKnownMetric = (key) => metricName(key) !== key;
