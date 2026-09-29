// Supabase 주소와 공개 키.
//
// 이 키는 publishable(anon) 키라 브라우저에 그대로 들어가도 된다. 실제 접근
// 제한은 서버 정책(RLS)이 한다 — server/02_policies.sql 참고. 로그인한 사람이
// 누구냐에 따라 보이는 줄이 달라지고, 승인 전에는 아무것도 못 올린다.
//
// secret 키(service_role)는 여기 절대 넣지 않는다. 그 키는 정책을 통째로
// 무시하기 때문에, 브라우저에 넣는 순간 아무나 전체 자료를 가져갈 수 있다.
//
// 아직 Supabase 프로젝트를 만들지 않았다. 만들고 나면 아래 두 줄을 채운다.
// (프로젝트 설정 → API → Project URL / publishable key)

export const SUPABASE_URL = 'https://tqkjdtopialrjekpwofn.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_jTixGmqf7fY9XD3foBEW7w_TRZ4B7jP';
