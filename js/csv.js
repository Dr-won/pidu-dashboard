// CSV 내려받기. 앱의 lib/data/csv_export.dart 와 **같은 열·같은 순서**다.
//
// 열이 어긋나면 앱에서 뽑은 파일과 웹에서 뽑은 파일을 합칠 수 없다
// (tool/merge_exports.ps1). 그래서 서버에 없는 열도 이름과 자리를 지키고 값만
// 비운다. 지금 비는 열은 아래 EMPTY_ON_SERVER 에 적어 뒀다.

import { metricName } from './metric_names.js?v=432fda0';

const SUBJECT_COLUMNS = [
  'research_code', 'sex', 'birth_year', 'age_at_measurement',
  'height_cm', 'weight_kg', 'bmi', 'group_label', 'consent_date',
];

const SESSION_COLUMNS = [
  'assessment_id', 'protocol', 'position', 'recorded_at', 'rater_code',
  'camera_distance_cm', 'camera_height_cm', 'front_camera', 'effective_fps',
  'image_width', 'image_height', 'pose_model_version', 'app_version',
  'device_model', 'gait_surface', 'gait_speed_kmh', 'gait_handrail', 'note',
];

const MEASURE_COLUMNS = [
  'metric_key', 'value', 'unit', 'trial', 'quality_level', 'quality_issues',
  'used_frames', 'min_visibility', 'jitter_sd', 'trunk_rotation',
];

/**
 * 서버 표에 자리가 없어 늘 비는 열.
 *
 * 앱은 기기 안 DB에 이 값들을 갖고 있지만 서버 스키마(server/01_schema.sql)로는
 * 올라가지 않는다. 웹에서 뽑은 파일로 품질을 따지려면 이 열들을 서버 표에
 * 먼저 추가해야 한다.
 */
export const EMPTY_ON_SERVER = [
  'position', 'effective_fps',
  'used_frames', 'min_visibility', 'jitter_sd', 'trunk_rotation',
];

/** 측정 시점의 만 나이. 출생연도만 있으므로 연도 차이로 구한다(앱과 같다). */
function ageAt(birthYear, recordedAt) {
  if (!birthYear || !recordedAt) return '';
  const y = new Date(recordedAt).getFullYear();
  return Number.isNaN(y) ? '' : y - birthYear;
}

function bmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return '';
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '');

/** 값 하나를 CSV 칸으로. 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다. */
function cell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}

const toRow = (arr) => arr.map(cell).join(',');

/**
 * 측정값 하나가 한 행인 long 형식 CSV 문자열.
 *
 * @param records `{ subject, assessment, measurements }` 목록
 */
export function toLongCsv(records) {
  const header = [...SUBJECT_COLUMNS, ...SESSION_COLUMNS, ...MEASURE_COLUMNS];
  const lines = [toRow(header)];

  for (const { subject: s, assessment: a, measurements } of records) {
    const base = [
      s?.research_code, s?.sex, s?.birth_year, ageAt(s?.birth_year, a.recorded_at),
      s?.height_cm, s?.weight_kg, bmi(s?.height_cm, s?.weight_kg),
      s?.group_label, dateOnly(s?.consent_at),

      a.id, a.protocol, '' /* position */, a.recorded_at, a.rater_code,
      a.camera_distance_cm, a.camera_height_cm, a.front_camera, '' /* effective_fps */,
      a.image_width, a.image_height, a.pose_model_version, a.app_version,
      a.device_model, a.gait_surface, a.gait_speed_kmh, a.gait_handrail, a.note,
    ];

    for (const m of measurements) {
      lines.push(toRow([
        ...base,
        m.metric_key, m.value, m.unit, m.trial,
        m.quality_level, m.quality_issues,
        '', '', '', '', // 서버에 없는 품질 상세
      ]));
    }
  }

  return lines.join('\r\n');
}

/**
 * 사람이 읽기 좋은 표. 지표 이름이 한국어로 들어간다.
 *
 * 분석용이 아니라 대상자에게 보여 주거나 출력할 때 쓴다. 분석에는 long 을
 * 쓴다 — 한국어 이름은 바뀔 수 있고, 바뀌면 열이 달라진다.
 */
export function toReadableCsv(records) {
  const lines = [toRow(['연구코드', '측정', '측정일시', '측정자', '지표', '값', '단위', '차수', '품질'])];

  for (const { subject: s, assessment: a, measurements } of records) {
    for (const m of measurements) {
      lines.push(toRow([
        s?.research_code, a.protocol, a.recorded_at, a.rater_code,
        metricName(m.metric_key), m.value, m.unit, m.trial, m.quality_level,
      ]));
    }
  }

  return lines.join('\r\n');
}

/**
 * 파일로 내려받게 한다.
 *
 * 앞에 BOM 을 붙인다. 없으면 한국어 엑셀이 UTF-8 로 못 알아보고 한글이 깨진다
 * (앱도 같은 이유로 붙인다).
 */
export function download(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 바로 지우면 사파리에서 내려받기가 끊긴다. 잠깐 두었다 지운다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 파일 이름에 쓸 날짜(YYYYMMDD). */
export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
