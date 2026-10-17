// 개발용 가짜 서버. 화면 모양을 로그인 없이 확인할 때만 쓴다.
//
// 켜지는 조건은 db.js 가 정한다 — 내 PC(127.0.0.1·localhost)에서 주소에
// `?demo` 를 붙였을 때뿐이다. 배포된 주소(github.io)에서는 ?demo 를 붙여도
// 이 파일을 불러오지 않는다.
//
// supabase-js 에서 db.js 가 실제로 부르는 것만 흉내 낸다. 쓰기(승인·접수코드)는
// 받기만 하고 아무것도 바꾸지 않는다. 숫자와 이름은 모두 예시다.

const day = (d, h = 10) => new Date(Date.UTC(2026, 9, d, h - 9, 20)).toISOString();

const PROFILES = [
  { id: 'demo-admin', display_name: '원영인', rater_code: 'S01', role: 'admin', status: 'approved', affiliation: '문경대 스포츠재활', decided_at: day(1) },
  { id: 'demo-s02', display_name: '김민수', rater_code: 'S02', role: 'rater', status: 'approved', affiliation: '문경대', decided_at: day(3) },
  { id: 'demo-s03', display_name: '이지은', rater_code: 'S03', role: 'rater', status: 'approved', affiliation: '문경대', decided_at: day(3) },
  { id: 'demo-p1', display_name: '박서준', rater_code: null, role: 'rater', status: 'pending', affiliation: '건양대', requested_at: day(16) },
  { id: 'demo-r1', display_name: '정하늘', rater_code: null, role: 'rater', status: 'rejected', affiliation: null, decided_at: day(9) },
  // 웹으로 가입해 자기를 잰 사람(연구코드 W-). 이름은 여기서 이어 붙는다.
  { id: 'demo-w1', display_name: '최유진', rater_code: null, role: 'member', status: 'approved', affiliation: null, decided_at: day(11) },
];

const SUBJECTS = [
  { id: 'sub-1', research_code: 'KY-15688', group_label: '청소년', sex: 'female', birth_year: 2008, height_cm: 162, weight_kg: 51, consent_at: day(2) },
  { id: 'sub-2', research_code: 'KY-15702', group_label: '청소년', sex: 'male', birth_year: 2009, height_cm: 171, weight_kg: 63, consent_at: day(2) },
  { id: 'sub-3', research_code: 'MK-00031', group_label: '노인', sex: 'male', birth_year: 1958, height_cm: 166, weight_kg: 70, consent_at: day(5) },
  { id: 'sub-4', research_code: 'MK-00032', group_label: '노인', sex: 'female', birth_year: 1961, height_cm: 154, weight_kg: 56, consent_at: null },
  { id: 'sub-5', research_code: 'WC-00007', group_label: '휠체어', sex: 'male', birth_year: 1990, height_cm: 175, weight_kg: 68, consent_at: day(7) },
  { id: 'sub-6', research_code: 'W-00012', group_label: '웹 가입', sex: 'female', birth_year: 1995, height_cm: 160, weight_kg: 52, consent_at: day(11), owner: 'demo-w1' },
];

const ASSESSMENTS = [
  { id: 'as-1', subject_id: 'sub-1', protocol: 'postureAnterior', recorded_at: day(17, 14), rater_code: 'S01', device_model: 'SM-S928N', camera_distance_cm: 280, camera_height_cm: 100, front_camera: false, image_width: 400, image_height: 600, pose_model_version: 'blazepose-full', app_version: '3.1.0' },
  { id: 'as-2', subject_id: 'sub-1', protocol: 'postureAnterior', recorded_at: day(2, 15), rater_code: 'S01', device_model: 'SM-S928N', camera_distance_cm: 280, camera_height_cm: 100, front_camera: false, app_version: '3.0.4' },
  { id: 'as-3', subject_id: 'sub-1', protocol: 'rom', recorded_at: day(17, 14), rater_code: 'S01', device_model: 'SM-S928N', note: '오른쪽 어깨 통증 있다고 함. 끝 범위에서 멈춤.' },
  { id: 'as-4', subject_id: 'sub-1', protocol: 'rom', recorded_at: day(2, 15), rater_code: 'S01', device_model: 'SM-S928N' },
  { id: 'as-5', subject_id: 'sub-2', protocol: 'postureLateral', recorded_at: day(15, 11), rater_code: 'S02', device_model: 'SM-A556N' },
  { id: 'as-6', subject_id: 'sub-3', protocol: 'gaitLateral', recorded_at: day(14, 10), rater_code: 'S03', device_model: 'SM-A556N', gait_surface: '트레드밀', gait_speed_kmh: 3.5, gait_handrail: false },
  { id: 'as-7', subject_id: 'sub-3', protocol: 'postureAnterior', recorded_at: day(14, 10), rater_code: 'S03', device_model: 'SM-A556N' },
  { id: 'as-8', subject_id: 'sub-5', protocol: 'postureAnteriorSeated', recorded_at: day(12, 16), rater_code: 'S02', device_model: 'SM-S928N' },
  { id: 'as-9', subject_id: 'sub-6', protocol: 'postureAnterior', recorded_at: day(16, 20), rater_code: null, device_model: 'Chrome' },
  { id: 'as-10', subject_id: 'sub-2', protocol: 'exercise', recorded_at: day(16, 11), rater_code: 'S02', device_model: 'SM-A556N' },
];

const m = (assessment_id, metric_key, value, unit, quality_level = 'good', quality_issues = null, trial = 1) =>
  ({ assessment_id, metric_key, value, unit, quality_level, quality_issues, trial });

const MEASUREMENTS = [
  m('as-1', 'head_tilt', 1.2, 'deg'),
  m('as-1', 'shoulder_tilt', 1.8, 'deg'),
  m('as-1', 'pelvic_obliquity', 2.4, 'deg', 'fair', 'highJitter'),
  m('as-1', 'lateral_shift', 0.9, 'cm'),
  m('as-1', 'knee_alignment_left', 176.0, 'deg'),
  m('as-1', 'knee_alignment_right', 179.2, 'deg', 'poor', 'lowVisibility|partialBody'),
  m('as-2', 'head_tilt', 2.1, 'deg'),
  m('as-2', 'shoulder_tilt', 3.0, 'deg'),
  m('as-2', 'pelvic_obliquity', 2.2, 'deg'),
  m('as-2', 'lateral_shift', 1.4, 'cm'),
  m('as-2', 'knee_alignment_left', 175.1, 'deg'),
  m('as-2', 'knee_alignment_right', 178.4, 'deg'),
  m('as-3', 'rom_shoulder_flexion_left', 168, 'deg'),
  m('as-3', 'rom_shoulder_flexion_right', 141, 'deg', 'fair'),
  m('as-3', 'rom_hip_abduction_left', 38, 'deg'),
  m('as-3', 'rom_hip_abduction_right', 24, 'deg', 'invalid', 'trunkRotated'),
  m('as-4', 'rom_shoulder_flexion_left', 162, 'deg'),
  m('as-4', 'rom_shoulder_flexion_right', 150, 'deg'),
  m('as-4', 'rom_hip_abduction_left', 35, 'deg'),
  m('as-4', 'rom_hip_abduction_right', 27, 'deg'),
];

const SNAPSHOTS = [
  { assessment_id: 'as-1', path: 'demo/as-1/postureAnterior.png', face_blurred: true, created_at: day(17, 14), pose_json: demoPose() },
  { assessment_id: 'as-1', path: 'demo/as-1/side.png', face_blurred: false, created_at: day(17, 14) },
  { assessment_id: 'as-3', path: 'demo/as-3/report_p1.png', created_at: day(17, 14) },
  { assessment_id: 'as-3', path: 'demo/as-3/report_p2.png', created_at: day(17, 14) },
  { assessment_id: 'as-3', path: 'demo/as-3/report_p3.png', created_at: day(17, 14) },
];

const INTAKE_CODES = [
  { code: 'school2026', label: '2026 학교 체형검진', active: true, created_at: day(6) },
  { code: 'senior-fall', label: '노인복지관 가을 측정', active: false, created_at: day(1) },
];

const INTAKE_UPLOADS = [
  { code: 'school2026', name: '김하늘', research_code: 'KY-15688', views: ['anterior', 'lateral', 'posterior'], created_at: day(16), taken_at: null, replaced_at: null },
  { code: 'school2026', name: '박준호', research_code: 'KY-15702', views: ['anterior'], created_at: day(17), taken_at: null, replaced_at: null },
];

const TABLES = {
  profiles: PROFILES,
  subjects: SUBJECTS,
  assessments: ASSESSMENTS,
  measurements: MEASUREMENTS,
  snapshots: SNAPSHOTS,
  intake_codes: INTAKE_CODES,
  intake_uploads: INTAKE_UPLOADS,
};

/** 사진 칸에 쓸 예시 골격. 그림(img/ex/squat_start.png 400×600 가정) 위에 대충 얹는다. */
function demoPose() {
  const p = (x, y, v = 0.95) => ({ x, y, visibility: v });
  const lm = Array.from({ length: 33 }, () => p(0, 0, 0));
  Object.assign(lm, {
    11: p(165, 190), 12: p(235, 192), 13: p(150, 270), 14: p(250, 272),
    15: p(145, 340, 0.4), 16: p(255, 345), 23: p(175, 330), 24: p(225, 332),
    25: p(172, 440), 26: p(228, 442), 27: p(170, 540), 28: p(230, 545, 0.3),
    29: p(160, 555), 30: p(240, 560), 31: p(185, 570), 32: p(215, 572),
  });
  return { landmarks: lm };
}

/** 보고서 쪽 대신 쓸 흰 A4 한 장. 글씨와 칸만 대충 그린다. */
function fakeReportPage(n) {
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#1D2025'; g.font = 'bold 54px "Malgun Gothic", sans-serif';
  g.fillText(`예시 보고서 ${n}쪽`, 90, 150);
  g.font = '28px "Malgun Gothic", sans-serif'; g.fillStyle = '#6B7684';
  g.fillText('개발용 가짜 자료입니다 (?demo)', 90, 205);
  g.fillStyle = '#EDF0F4';
  for (let i = 0; i < 6; i++) g.fillRect(90, 290 + i * 230, 1060, 190);
  g.fillStyle = '#F9A8C9'; g.fillRect(90, 290, 14, 190);
  g.fillStyle = '#9CC9FF'; g.fillRect(90, 520, 14, 190);
  return c.toDataURL('image/png');
}

/** `select('*, subjects(*)')` 처럼 대상자를 붙여 달라는 요청을 흉내 낸다. */
function joinSubjects(rows, cols) {
  if (!/subjects\(/.test(cols ?? '')) return rows;
  return rows.map((r) => ({ ...r, subjects: SUBJECTS.find((s) => s.id === r.subject_id) ?? null }));
}

class Query {
  constructor(table) {
    this.rows = (TABLES[table] ?? []).map((r) => ({ ...r }));
    this.single = false;
    this.write = false;
  }
  select(cols) { this.rows = joinSubjects(this.rows, cols); return this; }
  eq(k, v) { this.rows = this.rows.filter((r) => r[k] === v); return this; }
  neq(k, v) { this.rows = this.rows.filter((r) => r[k] !== v); return this; }
  is(k, v) { this.rows = this.rows.filter((r) => (r[k] ?? null) === v); return this; }
  not(k, op, v) { if (op === 'is') this.rows = this.rows.filter((r) => (r[k] ?? null) !== v); return this; }
  in(k, list) { this.rows = this.rows.filter((r) => list.includes(r[k])); return this; }
  like(k, pat) {
    const re = new RegExp('^' + pat.split('%').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    this.rows = this.rows.filter((r) => re.test(String(r[k] ?? '')));
    return this;
  }
  order(k, opt = {}) {
    const dir = opt.ascending === false ? -1 : 1;
    this.rows.sort((a, b) => (a[k] ?? '') > (b[k] ?? '') ? dir : (a[k] ?? '') < (b[k] ?? '') ? -dir : 0);
    return this;
  }
  limit(n) { this.rows = this.rows.slice(0, n); return this; }
  maybeSingle() { this.single = true; return this; }
  update() { this.write = true; return this; }
  insert() { this.write = true; return this; }
  then(ok, bad) {
    const data = this.write ? null : this.single ? (this.rows[0] ?? null) : this.rows;
    return Promise.resolve({ data, error: null }).then(ok, bad);
  }
}

export function fakeClient() {
  const user = { id: 'demo-admin', email: 'demo@example.com' };
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
      signInWithPassword: async () => ({ data: { user }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table) => new Query(table),
    storage: {
      from: () => ({
        createSignedUrl: async (path) => {
          const page = /report_p(\d+)/.exec(path);
          if (page) return { data: { signedUrl: fakeReportPage(page[1]) }, error: null };
          const img = path.includes('side') ? 'img/ex/squat.png' : 'img/ex/squat_start.png';
          return { data: { signedUrl: img }, error: null };
        },
      }),
    },
  };
}
