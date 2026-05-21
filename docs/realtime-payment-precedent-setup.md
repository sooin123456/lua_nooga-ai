# 실시간 판정방, 결제, 판례 서버 설정

## 1. Supabase 실시간 판정방

1. Supabase 프로젝트를 만든다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행한다.
3. 프로젝트 URL과 anon key를 `.env`에 넣는다.

```bash
VITE_SUPABASE_URL=https://프로젝트.supabase.co
VITE_SUPABASE_ANON_KEY=anon-key
```

실시간 판정방은 `judgment_rooms`, `room_participants`, `room_messages` 테이블을 사용한다. 방을 만든 직후에는 대기 상태이고, 닉네임으로 입장한 A/B 당사자가 모두 들어오면 `started_at`과 60초 `expires_at`이 설정된다. 세 번째 이후 입장자는 `spectator` 역할로 저장되고 읽기만 가능하다. 메시지는 60초 방 안에서만 쓰고, 판정이 끝나면 앱이 `room_messages`를 삭제한 뒤 결과 JSON만 방에 남긴다. 앱은 방 입장/생성 전에 `cleanup_expired_room_messages()`를 호출해 만료된 방 메시지도 정리한다.

공유 가능한 판독 결과는 `judgment_results`, `result_comments`, `result_likes` 테이블을 사용한다. `judgment_results`에는 판독 결과 JSON만 저장하고 원문 대화 텍스트는 저장하지 않는다. 댓글은 120자 제한이며, 결과 공유 데이터는 기본 7일 만료로 생성한다.

운영에서 더 강하게 정리하려면 Supabase Scheduled Functions, pg_cron, 또는 외부 cron으로 아래 RPC를 주기 호출한다.

```sql
select public.cleanup_expired_room_messages();
```

## 2. Toss 990원 인앱결제

Toss 콘솔에서 소모성 상품 SKU를 만든다. 기본 SKU는 `precedent-verdict-990`이고, 콘솔에서 다른 SKU로 만들었다면 `.env`에 넣는다.

```bash
VITE_TOSS_IAP_PRECEDENT_SKU=precedent-verdict-990
```

앱은 `@apps-in-toss/web-framework`의 `IAP.createOneTimePurchaseOrder`를 호출한다. Toss 브릿지가 없는 로컬 브라우저에서는 과금하지 않고 `인앱결제 연결 예정` 상태로 빠진다.

사용자는 990원 판례 판독 전에 입력 대화가 판례 검색 서버로 전송되는 것에 명시적으로 동의해야 한다.

## 3. 판례 검색 서버

판례 원본은 `legalize-kr/precedent-kr`를 사용한다.

```bash
mkdir -p .data
git clone https://github.com/legalize-kr/precedent-kr.git .data/precedent-kr
cd server/precedent-api
npm install
npm run build:index
npm run dev
```

로컬 기본 주소는 `http://localhost:8787`이다. 앱 `.env`에 아래 값을 넣으면 결제 성공 후 판례 검색을 호출한다. Vercel 앱 안의 `/api`를 쓰는 경우 운영 URL은 `https://nuga-wrong-ai.vercel.app/api`다.

```bash
VITE_PRECEDENT_API_URL=http://localhost:8787
```

운영에서는 Vercel `/api` 또는 별도 호스팅한 판례 API의 HTTPS URL로 `VITE_PRECEDENT_API_URL`을 교체한다.

기본 인덱스는 로컬/소형 서버에서 바로 돌릴 수 있게 `PRECEDENT_MAX_RECORDS=20000`, `PRECEDENT_MAX_BODY_CHARS=700`으로 제한한다. 더 큰 서버에서는 값을 올려 전체 판례에 가깝게 인덱싱할 수 있다.

## 4. 토스 쇼핑 보상 연결

무료 판독 결과에서 이긴 사람이 받고 싶은 것을 입력하면 앱이 보상 카테고리를 고르고, `openURL`로 쇼핑 검색 URL을 연다. 기본값은 아래와 같다.

```bash
VITE_TOSS_SHOPPING_SEARCH_URL=https://service.toss.im/shopping-discovery/search?keyword={query}
```

토스 내부 딥링크나 공식 쇼핑 검색 URL이 따로 발급되면 `{query}` 자리에 검색어가 들어가도록 이 값만 바꾸면 된다.

## 5. 남은 운영 작업

- Supabase 프로젝트 생성과 SQL 실행: 완료
- 공유 결과/댓글/좋아요 SQL 실행: `supabase/schema.sql`에 포함
- Toss 콘솔에서 `precedent-verdict-990` 상품 생성
- 판례 API 서버 호스팅: Vercel `/api` MVP 완료, 대용량 인덱스는 별도 서버 권장
- 운영 URL 기준 CORS `ALLOWED_ORIGIN` 설정: 별도 서버 사용 시 필요
- 새 환경 변수로 AIT 재빌드 및 재업로드
