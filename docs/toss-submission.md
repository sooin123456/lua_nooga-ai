# Toss Mini App Submission Draft

## App Basics

- App name: 누가 잘못 AI
- appName: lua-nooga-ai
- Type: 비게임
- Subtitle: 루아 AI가 대화 속 잘못 비율을 가볍게 판독해드려요
- Primary color: #FFDF6E
- Logo: public/nuga-wrong-ai-icon.png

## Search Keywords

- 싸움
- 커플싸움
- 누가잘못
- 카톡싸움
- 대화분석
- 화해
- 판독
- 루아AI

## Detailed Description

누가 잘못 AI는 카카오톡 대화, 캡처 이미지, 녹음 상황처럼 일상에서 생긴 갈등 내용을 입력하면 루아 AI가 누가 얼마나 잘못했는지 퍼센티지로 보여주는 재미용 미니앱입니다.

사용자는 첫 화면에서 판정을 시작한 뒤, 메인 화면의 오늘의 핫 Battle에서 공유된 판독 순위를 별도 페이지로 열고 상세 화면에서 대화 요약과 댓글을 볼 수 있습니다. 또한 카톡 싸움 붙여넣기, 증거 캡처 제출하기, 현장 녹음 시작, 녹음 파일 불러오기 중 하나를 선택할 수 있습니다. 입력한 내용은 판독 전에 직접 확인하고 수정할 수 있으며, 무료 판독 결과에서는 오늘의 판정, A/B 참고 비율, 근거 3개, 한 줄 조언을 확인할 수 있습니다.

무료 판독 이후에는 이긴 사람이 받고 싶은 보상을 입력해 유사한 토스 쇼핑 추천 카테고리와 검색어를 확인할 수 있습니다. 또한 판독 결과는 카톡, 텔레그램, 링크로 공유해 사람들에게 물어볼 수 있고, 공유 결과에는 원문 대화를 저장하지 않고 판독 결과와 반응만 저장합니다. 상대방이 판정에 이의를 제기하면 사용자가 별도 동의한 뒤 990원을 더 내고 입력 대화를 판례 검색 서버로 전송해 유사 판례 근거를 확인할 수 있습니다.

입력 내용 기준의 재미용 판독이며 법률 상담, 심리 상담, 의료 상담 또는 실제 법적 판단을 대신하지 않습니다. 실시간 판정방은 닉네임으로 입장하며 A/B 당사자가 모두 들어온 뒤 60초 카운트가 시작됩니다. 세 번째 이후 입장자는 관전자로 읽기만 가능하고, 메시지는 판정 또는 만료 후 삭제됩니다.

## Current Release Notes

- Free local rule-based verdict flow is available.
- Screenshot OCR is available in the browser.
- Recording and audio file flows currently guide users to confirm or type the transcript manually.
- Premium precedent verdict uses Toss IAP structure and a configured precedent search API.
- Premium precedent verdict requires explicit consent before sending conversation text to the precedent API.
- Toss Shopping reward search opens through a configured URL.
- Realtime room participants enter with nicknames. The 60-second countdown starts only after A and B both join. Third and later entrants become read-only spectators. Room messages are temporarily stored and deleted after verdict or expiry.
- Shared result comments and likes are stored with the verdict result only, not with the original conversation text.
- Public comments block threat language and obvious private contact details before saving.

## Submission Checklist

- [x] GitHub repository pushed: https://github.com/sooin123456/Lua_Nooga-AI
- [x] Latest `.ait` bundle generated: lua-nooga-ai.ait
- [x] App icon is 600 x 600 PNG with non-transparent background.
- [x] Bundle size is under the 100MB upload policy.
- [ ] Apps in Toss console workspace/app is created.
- [ ] Console API secret token is registered locally with `npx ait token add`.
- [ ] `.ait` bundle is uploaded with `npm run deploy`.
- [ ] Toss app QR test is completed at least once.
- [ ] Console screenshots are uploaded if available.
- [ ] Non-game release checklist is reviewed before requesting inspection.
