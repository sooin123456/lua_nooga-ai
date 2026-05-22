# 2026-05-21 내일 작업지시서

## 현재 상태

- 앱 이름: `누가 잘못 AI`
- Toss appName: `lua-nooga-ai`
- 최신 AIT 배포 링크: `intoss-private://lua-nooga-ai?_deploymentId=019e47d6-61ab-7da5-8e45-a55e0030dba0`
- 최근 검증:
  - `npx tsc --noEmit`: 통과
  - `npm test`: 16개 파일, 88개 테스트 통과
  - `npm run lint`: 통과
  - `VITE_PRECEDENT_API_URL=https://nuga-wrong-ai.vercel.app/api npm run build`: 통과
  - `PRECEDENT_ENTITLEMENT_SECRET=test-secret` entitlement smoke: 통과
  - 로컬 브라우저에서 `랭킹 보기 -> 댓글달기 -> 댓글 등록` 확인
- 남아 있는 빌드 경고:
  - OCR/Tesseract 번들 때문에 500kB 초과 경고가 계속 남아 있음. 기능 실패는 아니지만 Toss 심사/초기 로딩 최적화 전에 분리 검토 필요.

## 2026-05-21 진행 완료

1. Supabase MCP 연결 확인
   - 프로젝트 URL: `https://aqubitcakjdofgvzqlms.supabase.co`
   - 원격 테이블 조회와 마이그레이션 적용이 가능함을 확인했다.

2. 원격 Supabase 스키마 보강
   - `room_participants`, `judgment_results`, `result_comments`, `result_likes` 테이블을 원격 DB에 생성했다.
   - `judgment_rooms.access_secret`, `judgment_rooms.started_at`, `room_messages.nickname`, `room_messages.client_key`를 추가했다.
   - 기존 room row에는 새 `access_secret`을 채웠다.

3. 실시간 방 직접 테이블 접근 잠금
   - `judgment_rooms`, `room_participants`, `room_messages`의 anon/authenticated 직접 table grant를 제거했다.
   - 직접 select 정책은 deny로 바꿨다.
   - anon key로 `judgment_rooms` 직접 조회 시 `42501 permission denied`가 나는 것을 확인했다.

4. 방 조작을 RPC 중심으로 이동
   - 추가 RPC:
     - `create_judgment_room`
     - `get_judgment_room`
     - `list_room_participants`
     - `join_judgment_room`
     - `start_judgment_room_countdown`
     - `list_room_messages`
     - `send_room_message`
     - `explode_judgment_room`
   - `join_judgment_room`에서 역할 배정과 60초 카운트 시작을 DB transaction 안에서 처리한다.
   - `send_room_message`는 `client_key`가 A/B 참여자인지 검증한 뒤 서버에서 author/nickname을 정한다.
   - `explode_judgment_room`은 A/B 참여자만 실행 가능하고, 실행 시 room_messages를 삭제한다.

5. 초대 링크 보안 강화
   - 초대 링크에 `roomKey`를 추가했다.
   - 앱은 `room` + `roomKey`가 있어야 방 RPC를 읽고 쓸 수 있다.
   - 잘못된 `roomKey`로 `get_judgment_room`을 호출하면 0 rows가 반환되는 것을 확인했다.

6. 프론트 room adapter 수정
   - Supabase room gateway가 raw table insert/update/delete 대신 RPC를 호출하도록 변경했다.
   - 방 생성/복사/공유 URL에 `roomKey`를 포함하도록 변경했다.
   - 메시지 전송/폭파에 `clientKey`와 `accessSecret`을 전달하도록 변경했다.

7. 원격 smoke test
   - anon client 기준 확인:
     - 방 생성 성공
     - 직접 테이블 조회 차단
     - 잘못된 secret 조회 차단
     - A/B 입장 및 카운트 시작 성공
     - A 메시지 전송 성공

8. 배포
   - 이전 AIT 배포:
     - `intoss-private://lua-nooga-ai?_deploymentId=019e4786-47f2-7526-a194-b316f318cbc8`

9. 결과 공유/댓글/좋아요 RPC 보안 잠금
   - `judgment_results`, `result_comments`, `result_likes`의 anon/authenticated 직접 table grant를 제거했다.
   - 추가 RPC:
     - `create_shared_result`
     - `get_shared_result`
     - `list_result_comments`
     - `add_result_comment`
     - `get_result_like_state`
     - `set_result_like`
     - `list_hot_battles`
   - anon client 기준 직접 테이블 조회는 `42501 permission denied`로 차단되는 것을 확인했다.
   - 댓글 저장, 좋아요 토글, 핫 Battle 조회가 RPC로 동작하는 것을 smoke test로 확인했다.

10. 오늘의 핫 Battle 서버 연결
   - 메인 화면의 `오늘의 핫 Battle`이 Supabase 공유 결과 랭킹 RPC를 먼저 불러오도록 바꿨다.
   - 서버 데이터가 없거나 실패하면 기존 샘플 데이터로 자연스럽게 fallback한다.
   - 공유 결과 상세의 댓글/좋아요도 동일한 서버 데이터 흐름을 사용한다.

11. 990원 이의제기 판례 분석 서버 게이트
   - `/api/payments/precedent-entitlement`를 추가했다.
   - `/api/precedents/search`는 entitlement token 없이는 `402`로 차단한다.
   - 프론트는 결제 확인 뒤 entitlement를 받고, 그 token을 포함해야 판례 검색을 호출한다.
   - 현재는 Toss 서버 결제 검증 credential이 없어 `orderId` 기반 서버 entitlement 구조까지만 구현했다. 실제 매출 연동 전에는 Toss 결제 검증 API 연결이 필요하다.

12. 결과 화면 UX 정리
   - 결과 화면의 보상 추천, 댓글/좋아요/공유, 이의제기 판례 분석을 접힘 섹션으로 정리했다.
   - 한 화면에 모든 입력폼이 한꺼번에 보이지 않도록 했다.
   - 판정 문구는 사용자가 원한 `A/B가 n% 선넘었어요` 형태를 유지했다.

13. 최신 AIT 배포
   - 새 AIT 배포 완료:
     - `intoss-private://lua-nooga-ai?_deploymentId=019e47d6-61ab-7da5-8e45-a55e0030dba0`

## 2026-05-21 남은 보안 메모

- Supabase advisor는 public `SECURITY DEFINER` RPC가 anon/authenticated에서 실행 가능하다고 경고한다.
- 이번 RPC들은 앱 기능상 anon에서 호출되어야 하며, 내부에서 `room_id + access_secret + client_key`를 검증하도록 바꿨다.
- 다만 advisor 경고를 완전히 없애려면 다음 단계에서 Edge Function 또는 private schema/API gateway 구조로 옮기는 것이 더 좋다.
- 결과 공유/댓글/좋아요는 RPC로 이동했다.
- advisor 경고를 완전히 없애려면 다음 단계에서 Edge Function 또는 private schema/API gateway 구조로 옮기는 것이 좋다.

## 내일 1순위 작업

1. Supabase 실제 서버 연결 확인
   - `supabase/schema.sql`을 원격 프로젝트 SQL Editor에 적용했는지 확인한다.
   - `judgment_rooms`, `room_messages`, `room_participants`, `shared_results`, `result_comments`, `result_likes` 테이블이 실제로 생성됐는지 확인한다.
   - Realtime publication에 방/메시지/참여자 테이블이 올라갔는지 확인한다.
   - `.env` 또는 배포 환경에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 들어갔는지 확인한다.

2. 실시간 폭파 판정방 실제 동작 검수
   - 방 생성 후 A가 닉네임으로 입장되는지 확인한다.
   - 초대 링크로 B가 들어온 뒤에만 60초 카운트가 시작되는지 확인한다.
   - 세 번째 사용자는 관전자로 들어가고 메시지 입력이 막히는지 확인한다.
   - 판정/만료 후 원문 메시지가 삭제되고 결과만 남는지 확인한다.
   - 뒤로 가기, 새로고침, 네트워크 끊김 상황에서 방 상태가 깨지지 않는지 확인한다.

3. Toss 실결제 검증 연결
   - Toss 콘솔에서 소모성 상품 SKU를 만든다.
   - 기본 SKU는 `precedent-verdict-990`이다. 다르게 만들면 `VITE_TOSS_IAP_PRECEDENT_SKU`에 넣는다.
   - Toss 서버 결제 검증 credential과 API 문서를 확인한 뒤 `/api/payments/precedent-entitlement`에서 실제 결제 성공 여부를 검증한다.
   - 검증 성공 후에만 entitlement token을 발급한다.

4. 결과 공유/댓글/좋아요 실제 데이터 검수
   - 결과 화면의 좋아요/댓글/공유가 Supabase에 저장되는지 확인한다.
   - 원문 대화가 공유 결과에 저장되지 않는지 확인한다.
   - 댓글 필터 `선넘었어요` 문구가 과격 표현과 개인정보를 잘 막는지 테스트한다.
   - 공유 링크로 들어왔을 때 결과 상세가 복원되는지 확인한다.

5. Toss IAP 990원 실기기 확인
   - 로컬 브라우저는 `인앱결제 연결 예정`으로 빠지는 것이 정상이다.
   - Toss WebView에서 결제 성공 이벤트가 오는지 실기기에서 확인한다.
   - 결제 성공 후에만 entitlement 발급과 `/precedents/search` 호출이 이어지는지 확인한다.

6. 판례 API 품질 개선
   - 현재 판례 검색은 단순 토큰 매칭 기반이다.
   - 검색 품질 개선 후보:
     - 욕설/비난/지각/연락두절/금전/사과 거부 등 갈등 유형 태깅
     - 판례 카테고리 우선순위 조정
     - 반환 판례에 “왜 이 판례가 참고인지” 한 줄 근거 강화
   - API 입력 길이 제한, 요청 빈도 제한, 에러 메시지를 다시 확인한다.

## 내일 2순위 작업

1. 메인 UX 다듬기
   - `오늘의 핫 Battle` 토글이 너무 위에 무겁게 느껴지는지 실기기에서 확인한다.
   - 상세 화면에서 댓글 등록 후 즉시 카운트가 올라가는지 확인한다.
   - `댓글달기` 버튼 문구를 `판정 보기`로 바꿀지 검토한다. 지금은 사용자가 댓글 목적을 바로 이해하는 쪽을 우선했다.

2. Toss 심사 문서 최신화
   - `docs/toss-submission.md`에 최신 UX와 결제/개인정보 흐름이 반영됐는지 확인한다.
   - “재미용 판독이며 실제 법률 판단이 아니다” 문구가 결과/판례 화면에 충분히 보이는지 확인한다.
   - 캡처/녹음/텍스트 입력에서 사용자가 대화 전송 여부를 오해하지 않게 문구를 점검한다.

3. 성능 최적화
   - OCR 기능을 처음 화면 번들에서 더 늦게 불러오도록 코드 스플리팅한다.
   - Toss WebView 첫 진입 로딩 시간을 실기기에서 확인한다.
   - 루아 이미지와 배경 이미지 용량을 확인하고 필요하면 WebP 변환한다.

4. QA 자동화 추가
   - Playwright 또는 브라우저 자동화로 핵심 플로우를 하나 만든다.
   - 추천 플로우:
     - 앱 시작
     - 핫 Battle 토글
     - 상세 댓글 등록
     - 텍스트 붙여넣기 판독
     - 결과 댓글/좋아요
     - 이의제기 판례 분석 동의 버튼 상태

## 사용자가 결정해야 하는 것

1. Toss IAP 상품명
   - 추천: `이의제기 판례 분석`
   - 가격: `990원`
   - SKU 추천: `precedent-verdict-990`

2. 핫 Battle 공개 범위
   - A안: 모든 공유 결과 공개
   - B안: 사용자가 “공개하기”를 누른 결과만 공개
   - 추천: B안. 민감한 싸움 내용을 다루기 때문에 명시적 공개가 안전하다.

3. 실시간 판정방 보관 정책
   - 추천: 원문 메시지는 판정 직후 삭제, 결과만 저장.
   - 결과도 사용자가 공유를 누르기 전에는 공개 저장하지 않는다.

4. 판례 분석 문구 강도
   - 현재: `990원을 더 내면 판례 근거로 제대로 따져드려요.`
   - 더 안전한 심사용 문구 후보: `990원을 더 내면 유사 판례를 참고해 한 번 더 분석해드려요.`
   - 추천: 심사 제출 전에는 안전한 문구로 낮추는 것.

## 미리 돌린 서브에이전트 검수 항목

아래 역할로 서브에이전트를 실행했고, 결과를 반영했다.

1. 보안/개인정보 검수
   - Supabase RLS, localStorage 익명 식별자, 공개 댓글, 실시간 방 삭제, 판례 API 개인정보 전송, CORS/Rate limit, env 노출을 점검한다.

2. UI/UX 검수
   - 메인/핫 Battle/실시간방/결과/공유/이의제기 판례 분석 흐름에서 화면 과밀, 뒤로 가기, 빈 상태, 로딩/에러, 문구 일관성을 점검한다.

3. 서버/출시 준비 검수
   - Supabase schema, realtime room adapter, Toss IAP, 판례 API, 배포/심사 문서, 테스트/빌드 기준으로 실제 출시를 막는 항목을 점검한다.

## 서브에이전트 검수 결과

### 1. 보안/개인정보 검수 결과

출시 전 반드시 막아야 하는 항목:

1. Supabase RLS가 너무 넓다.
   - `supabase/schema.sql`의 `judgment_rooms`, `room_participants`, `room_messages` 조회 정책이 `using (true)`라서 anon key만으로 방/닉네임/메시지를 열람할 위험이 있다.
   - 내일 첫 작업은 raw table 공개 접근을 막고, 방 초대 토큰 또는 참여자 키 기반 접근으로 바꾸는 것이다.

2. 방 상태 변경이 클라이언트 신뢰 기반이다.
   - open 방이면 아무 anon client가 `started_at`, `expires_at`, `status`, `result_json`을 바꿀 수 있는 구조다.
   - 카운트 시작, 폭파, 결과 저장은 `SECURITY DEFINER RPC` 또는 서버 API로 옮겨야 한다.

3. 메시지 작성자 위조가 가능하다.
   - 현재 메시지 insert 정책은 해당 역할의 참여자가 있는지만 확인한다.
   - `client_key` 또는 Toss 사용자 식별자 기반으로 “내가 A/B인지”를 DB/RPC에서 검증해야 한다.

4. 공개 결과/댓글/좋아요가 클라이언트 필터에 의존한다.
   - 댓글 개인정보/욕설 필터는 React에서만 돌기 때문에 직접 API 호출로 우회 가능하다.
   - 서버/RPC 또는 DB 제약으로 최소한의 개인정보/위협 표현 차단이 필요하다.

5. 좋아요 삭제 정책이 소유자를 확인하지 않는다.
   - `result_likes` delete policy가 `client_key`를 확인하지 않아 다른 사용자의 좋아요를 지울 수 있다.

6. 판례 API가 결제 검증 없이 호출 가능하다.
   - Toss IAP 성공은 현재 클라이언트 이벤트만 믿는다.
   - `/api/precedents/search`는 서버 검증된 결제/entitlement 토큰을 요구해야 한다.

7. 판례 API에 rate limit/body limit이 부족하다.
   - 대화 원문이 들어오는 API라 입력 길이 제한, 빈도 제한, CORS 제한, 개인정보 처리 문구가 필요하다.

8. 데이터 삭제 정책이 부족하다.
   - 현재 cleanup은 expired room message 위주다.
   - 방, 참여자, 결과, 댓글, 좋아요 보관 기간을 정하고 cron으로 삭제해야 한다.

### 2. UI/UX 검수 결과

내일 또는 이후 개선할 항목:

1. 뒤로 가기 동작이 너무 단순하다.
   - 현재 전역 `popstate`가 대부분 홈으로 보낸다.
   - Toss WebView에서는 상세 -> 목록, 결과 -> 이전 단계처럼 한 단계씩 돌아가는 구조가 더 자연스럽다.

2. 결과 화면이 너무 많은 일을 한다.
   - 판독, 근거, 보상 추천, 댓글/공유, 이의제기 판례 분석이 모두 한 화면에 쌓인다.
   - 보상/반응/이의제기 영역을 접힘 섹션이나 우선순위 액션으로 나누는 것이 좋다.

3. 990원 이의제기 결제 전 확인 화면이 필요하다.
   - 가격, 전송되는 정보, 실패/취소 시 동작, 판례가 없을 때 동작을 결제 직전에 보여줘야 한다.
   - 공유 결과 페이지에서 `sourceText`가 비어 있으면 결제 후 검색할 대화가 없을 수 있다.

4. 실시간 방 실패 복구 UX가 부족하다.
   - 방 생성/입장/복사/전송 실패 시 재시도 버튼, 새 방 만들기, 만료 후 다음 행동이 필요하다.

5. 방 입력창은 키보드와 safe-area 대응이 필요하다.
   - Toss WebView에서 키보드가 열릴 때 메시지 입력창과 판정 버튼이 가려질 수 있다.

6. 오늘의 핫 Battle은 아직 샘플 데이터다.
   - 서버 연결 전에는 “샘플” 또는 “공개된 판독 준비 중” 같은 정직한 상태 문구가 필요하다.

7. 공유/댓글/좋아요 로딩/실패 상태가 약하다.
   - Supabase 미연결 모드에서 로컬 댓글이 공개 댓글처럼 보일 수 있다.

8. 문구 톤 정리가 필요하다.
   - `Battle`, `댓글달기`, `990원 더 내고`, `제대로 따져드려요`, `폭발 판정방`의 톤을 Toss 스타일 해요체로 정리한다.

### 3. 서버/출시 준비 검수 결과

출시를 막는 항목:

1. Supabase RLS/GRANT 재설계
   - broad RLS를 제거하고 명시적 `GRANT`와 접근 모델을 확정해야 한다.

2. 실시간 방 동시 입장 race condition
   - 두 명이 동시에 들어오면 둘 다 A/B 같은 역할을 고를 수 있고 unique index 충돌로 실패할 수 있다.
   - 역할 배정은 DB RPC에서 원자적으로 처리해야 한다.

3. 폭파 저장 실패 처리
   - `explodeRoom` 실패 후에도 UI가 결과로 이동할 수 있다.
   - 서버 저장 실패 시 원문 삭제/결과 저장 불일치가 생기므로 retry 또는 보류 상태가 필요하다.

4. 판례 인덱스 품질
   - 현재 Vercel 번들 index는 500건이고 README 같은 비판례 문서가 섞일 수 있다.
   - 실제 판례 파일만 필터링하고 더 큰 인덱스로 다시 빌드해야 한다.

5. resultShare adapter 테스트 부족
   - 공유 결과/댓글/좋아요 Supabase adapter에 직접 테스트가 필요하다.

6. Toss 제출 체크리스트 미완료
   - 콘솔 생성, token 등록, QR 테스트, 스크린샷, non-game 체크리스트가 남아 있다.

## 내일 추천 실행 순서

1. Supabase RLS/RPC 잠금
   - 방 조회/참여/메시지/폭파/결과 저장을 raw table 접근이 아니라 RPC 중심으로 바꾼다.
   - 좋아요 삭제 정책에 `client_key` 소유자 검증을 추가한다.

2. 실시간 방 정합성 수정
   - 역할 배정 race condition을 원자적 RPC로 해결한다.
   - `explodeRoom` 실패 시 결과 이동을 막고 재시도 UX를 만든다.
   - 만료/네트워크 실패 복구 CTA를 추가한다.

3. 결제/판례 서버 검증
   - Toss IAP 성공을 서버에서 검증하고 entitlement를 발급한다.
   - `/api/precedents/search`는 entitlement가 있을 때만 허용한다.
   - body limit/rate limit/CORS를 적용한다.

4. 결과 화면 UX 정리
   - 보상 추천, 반응/공유, 이의제기 판례 분석을 접힘 섹션으로 정리한다.
   - 결제 직전 확인 화면을 추가한다.

5. 오늘의 핫 Battle 서버 연결
   - 샘플 상태임을 표시하거나 실제 `shared_results` 랭킹으로 연결한다.
   - 상세 댓글을 서버 댓글로 저장한다.

6. 제출 체크리스트 마무리
   - `docs/toss-submission.md`를 최신 상태로 채우고 Toss 실기기 QR 테스트를 진행한다.

## 내일 시작 명령

```bash
npm install
npm test
npm run lint
VITE_PRECEDENT_API_URL=https://nuga-wrong-ai.vercel.app/api npm run build
```

로컬 확인이 필요하면:

```bash
npm run dev
```

## 작업 원칙

- 민감한 원문 대화는 기본 저장하지 않는다.
- 사용자가 명시적으로 공유한 결과만 공개 영역에 올린다.
- 판례 분석은 결제와 별도 동의를 모두 통과한 뒤에만 서버로 보낸다.
- Toss 심사용 문구는 재미용/참고용임을 분명히 한다.
- 실시간 방은 A/B가 모두 입장한 뒤에만 60초가 시작되어야 한다.
