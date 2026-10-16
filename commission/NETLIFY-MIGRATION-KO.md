# Netlify 이전 준비

## 선택 이유
Netlify 공식 안내는 무료 플랜의 상업용 프로젝트를 허용합니다. Node.js 서버 함수와 예약 실행을 지원하므로 기존 Discord 접수 API를 유지할 수 있습니다. Free는 월 사용량 한도가 있으며 무제한 운영을 보장하지 않습니다. 요금제 변경·추가 구매는 하지 않습니다.

## 현재 준비된 파일
- netlify.toml: 정적 페이지, /api 경로 및 보안 헤더 설정
- netlify/adapter.mjs: 기존 Node API를 Netlify 요청/응답 형식으로 연결. 여러 로그인 쿠키와 16KB 본문 제한 유지
- netlify/functions/requests.mjs: 로그인·신청·대화·삭제 API
- netlify/functions/cleanup-daily.mjs: 매일 18:00 UTC(한국 시간 다음 날 03:00) 정리 실행 요청
- netlify/functions/cleanup-background.mjs: 인증된 삭제 실행. 개인정보 대신 성공·실패 건수만 로그에 남김

예약 함수는 30초 제한이 있으므로 정리 작업은 별도의 백그라운드 함수로 실행합니다. 백그라운드 함수는 현재 Credit-based Free에서도 지원됩니다. 비밀값은 저장소에 포함하지 않습니다.

## 실제 배포 순서
1. 사용자가 Netlify에 직접 로그인합니다. 신규 가입 시 약관과 Free 플랜을 확인합니다.
2. eoram00/aramportfolio 저장소를 연결하고 Base directory를 commission으로 지정합니다. publish는 public, functions는 netlify/functions입니다. 설정 파일은 commission/netlify.toml입니다.
3. 무료 기본 도메인을 발급받습니다. 최종 도메인이 정해지기 전에는 포트폴리오 링크·OAuth 주소를 바꾸지 않습니다.
4. .env.example의 서버 환경 변수를 Netlify Functions에 설정합니다. APP_URL은 새 사이트의 HTTPS origin입니다. SESSION_SECRET과 CRON_SECRET은 로컬에서 생성한 값을 안전하게 복사하며 채팅·GitHub에 보내지 않습니다.
5. Discord 앱에 새 APP_URL/api/auth/discord/callback 주소를 추가합니다. Google OAuth도 새 APP_URL/api/auth/google/callback을 등록합니다. 기존 주소는 이전 확인 전까지 유지합니다.
6. 개인정보 안내의 호스팅 제공자를 실제 Netlify 계약·처리 국가·로그 보관 조건에 맞게 수정합니다. 검토 완료 전 접수는 비활성 상태를 유지합니다.
7. 실제 배포에서 로그인, 태그가 포함된 테스트 신청, 본인/관리자 접근 및 삭제를 최소 1회 확인합니다. Netlify Functions 화면에서 cleanup-daily 예약 상태와 cleanup-background 실행 결과를 확인합니다.
8. 정상 동작 확인 후 포트폴리오의 신청 링크를 새 주소로 변경합니다. 기존 Vercel 신청 사이트는 새 주소 안내·이동으로 정리합니다.

## 확인 근거
- 상업용 프로젝트: https://www.netlify.com/blog/introducing-netlify-free-plan/
- 현재 플랜·한도: https://www.netlify.com/pricing/
- 예약 실행: https://docs.netlify.com/build/functions/scheduled-functions/
- 백그라운드 함수: https://docs.netlify.com/build/functions/background-functions/

## 남은 계정 작업
- Netlify 로그인 및 저장소 접근 연결
- 최종 도메인 확인 후 Discord Redirects 추가
- Google OAuth 앱·클라이언트 설정 및 비밀값 등록
- 실제 개인정보 처리 조건 확인 및 공개 접수 활성화
