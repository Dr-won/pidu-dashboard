# 웹 대시보드

앱이 서버로 올린 측정 자료를 **보는** 화면. 측정은 앱에서만 한다 — 자세 인식
라이브러리가 브라우저에서 돌지 않는다(docs/web_dashboard_plan.md).

폴더 이름이 `web/` 이 아닌 이유: Flutter 가 `web/` 을 자기 빌드용으로 쓴다.

## 무엇이 있나

| 화면 | 주소 | 하는 일 |
|---|---|---|
| 대상자 | `#/subjects` | 연구코드 목록, 찾기 |
| 대상자 상세 | `#/subject/<id>` | 측정 기록 목록, 지표 추이, CSV |
| 측정 상세 | `#/assessment/<id>` | 사진+골격, 측정값, 촬영 조건, CSV |
| 수집 현황 | `#/overview` | 측정자별 수집량, 안 올린 사람 |
| 측정자 승인 | `#/approvals` | 가입 요청 승인·거절 (관리자만) |

승인 화면은 앱의 `lib/features/account/approvals_screen.dart` 와 같은 일을 한다.
맥미니 앞에 앉지 않아도 승인할 수 있게 하려고 뒀다. 어느 쪽에서 승인하든
결과는 같다.

## 돌리기 전에

`config.js` 의 두 줄을 채워야 한다. 아직 비어 있으면 "설정이 필요합니다"
화면이 뜬다.

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_...';
```

Supabase 프로젝트를 만든 뒤 SQL Editor 에 이 순서로 붙여 넣는다.

1. `server/01_schema.sql` — 표와 보관함
2. `server/02_policies.sql` — 누가 무엇을 보는지

키는 publishable(anon) 키다. 브라우저에 들어가도 된다 — 실제 제한은 서버
정책(RLS)이 한다. **secret(service_role) 키는 절대 넣지 않는다.** 그 키는
정책을 통째로 무시해서, 넣는 순간 누구나 전체 자료를 가져갈 수 있다.

## 로컬에서 보기

`fetch` 와 ES 모듈 때문에 파일을 직접 열면(`file://`) 안 된다. 간단한 서버를
띄운다.

```powershell
cd C:\src\hpe_rehab\dashboard
python -m http.server 5173
```

그 다음 <http://localhost:5173> 로 들어간다.

Supabase 의 Authentication → URL Configuration 에 이 주소를 허용 목록으로
넣어야 로그인이 된다.

## 올리기

빌드가 필요 없다. 이 폴더를 그대로 Cloudflare Pages 에 올리면 된다
(빌드 명령 없음, 출력 폴더 `dashboard`). Dr.Won 과 같은 자리에 둔다.

올린 뒤 Supabase 의 허용 주소에 그 도메인도 넣는다.

## 아직 안 되는 것

**앱에 측정 자료 올리기가 아직 없다.** 그래서 대상자·측정 화면은 비어 있다.
승인 화면만 지금 바로 쓸 수 있다.

올리기가 붙으면 나머지도 그대로 동작한다. 읽는 표 구조는 `server/01_schema.sql`
로 이미 정해져 있다.

그 밖에:

- `snapshots.pose_json` 의 모양이 아직 확정되지 않았다. `js/skeleton.js` 가
  흔한 세 모양을 다 받게 해 뒀고, 모르는 모양이면 골격 없이 사진만 보여 준다.
  업로드를 만들 때 모양이 정해지면 그쪽에 맞춰 줄이면 된다.
- CSV 에서 `position`, `effective_fps`, `used_frames`, `min_visibility`,
  `jitter_sd`, `trunk_rotation` 열은 늘 비어 있다. 서버 표에 그 자리가 없다.
  열 이름과 순서는 앱과 같게 뒀으므로 `tool/merge_exports.ps1` 로 합칠 수 있다.
  품질 상세까지 웹에서 보려면 `server/01_schema.sql` 에 열을 먼저 추가해야 한다.
- 지표 이름은 `js/metric_names.js` 에 따로 적혀 있다. 앱에 지표가 늘면 여기도
  늘려야 한다. 안 늘리면 키가 그대로 보인다(사라지지는 않는다).
