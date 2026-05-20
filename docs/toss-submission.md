# Toss Mini App Submission Draft

## App Basics

- App name: 누가 잘못 AI
- appName: nuga-wrong-ai
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

사용자는 첫 화면에서 판정을 시작한 뒤, 메인 화면에서 카톡 싸움 붙여넣기, 증거 캡처 제출하기, 현장 녹음 시작, 녹음 파일 불러오기 중 하나를 선택할 수 있습니다. 입력한 내용은 판독 전에 직접 확인하고 수정할 수 있으며, 무료 판독 결과에서는 오늘의 판결, A/B 잘못 비율, 근거 3개, 한 줄 조언을 확인할 수 있습니다.

무료 판독 이후에는 이긴 사람이 받고 싶은 보상을 입력해 유사한 토스 쇼핑 추천 카테고리와 검색어를 확인할 수 있습니다. 향후에는 990원 판례 판독을 통해 유사 판례 근거를 서버와 연결해 제공할 예정입니다.

입력 내용 기준의 재미용 판독이며 법률 상담, 심리 상담, 의료 상담 또는 실제 법적 판단을 대신하지 않습니다.

## Current Release Notes

- Free local rule-based verdict flow is available.
- Screenshot OCR is available in the browser.
- Recording and audio file flows currently guide users to confirm or type the transcript manually.
- Premium precedent verdict, Toss Shopping deep link, and payment are prepared as UI only and do not run real payment yet.
- No server-side storage is used in this MVP.

## Submission Checklist

- [x] GitHub repository pushed: https://github.com/sooin123456/Lua_Nooga-AI
- [x] Latest `.ait` bundle generated: nuga-wrong-ai.ait
- [x] App icon is 600 x 600 PNG with non-transparent background.
- [x] Bundle size is under the 100MB upload policy.
- [ ] Apps in Toss console workspace/app is created.
- [ ] Console API secret token is registered locally with `npx ait token add`.
- [ ] `.ait` bundle is uploaded with `npm run deploy`.
- [ ] Toss app QR test is completed at least once.
- [ ] Console screenshots are uploaded if available.
- [ ] Non-game release checklist is reviewed before requesting inspection.
