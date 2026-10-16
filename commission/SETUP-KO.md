# 신청 사이트 연결 안내

## 현재 구성

- 신청 사이트에서 REX STUDIO 표기를 제거했습니다.
- Discord 또는 Google(Gmail) 로그인 후에만 신청할 수 있습니다. 두 로그인은 서로 다른 계정으로 취급하며, 신청한 계정으로 다시 로그인해야 이력을 볼 수 있습니다. Gmail 로그인은 메일함 접근 권한을 요청하지 않습니다.
- 신청 하나마다 지정한 디스코드 포럼에 게시글을 만듭니다. 서버 운영자에게 멘션하고 내용을 올립니다. 신청자는 사이트에서만 자신의 내용과 대화를 확인합니다.
- 서버 관리자는 Discord 계정으로 로그인합니다. 수락·거부·취소·메시지는 게시글의 ‘신청 관리 · 연락하기’ 링크로 들어가 처리합니다.

## 1. 만들어둔 포럼 설정

포럼 설정 → 권한에서 @everyone의 ‘채널 보기’를 끕니다. 본인과 봇에게만 채널 보기를 허용합니다. 다른 역할에 채널 보기 허용이 있으면 해제합니다. 디스코드 서버 관리자 권한을 가진 사람은 계속 볼 수 있습니다. 코드에서도 공개 포럼이면 접수를 차단합니다.

디스코드 사용자 설정 → 고급 → 개발자 모드를 켜고 다음 숫자 ID를 복사합니다.

- 서버 아이콘 우클릭 → 서버 ID
- 만든 포럼 우클릭 → 채널 ID (DISCORD_FORUM_ID)
- 본인 프로필 우클릭 → 사용자 ID (DISCORD_OWNER_IDS)

카테고리나 웹훅 주소는 필요 없습니다.

## 2. 봇 만들기

https://discord.com/developers/applications → New Application → 이름을 ARAM Requests로 지정합니다.

- General Information의 Application ID를 DISCORD_CLIENT_ID에 입력합니다.
- Bot 메뉴에서 봇 토큰을 발급하고 DISCORD_BOT_TOKEN에 저장합니다. 토큰은 채팅에 보내지 마세요.
- OAuth2 → URL Generator에서 bot을 선택하고 다음 권한을 선택합니다: View Channels, Send Messages, Send Messages in Threads, Embed Links, Read Message History, Manage Threads.
- 생성된 초대 링크를 열어 새 서버에 추가합니다. Administrator 전체 권한과 Message Content Intent는 필요 없습니다.
- 포럼 권한에서 봇에게 앞의 권한을 허용합니다. 이 봇은 REST 요청으로 동작하므로 별도로 24시간 봇 프로그램을 켜둘 필요가 없습니다.

## 3. 사이트 주소와 Discord 로그인

Vercel에서 GitHub eoram00/aramportfolio를 새 프로젝트로 가져오고 Root Directory를 commission, Framework를 Other로 설정합니다. 새 사이트의 실제 주소를 APP_URL에 입력합니다.

Discord 앱 → OAuth2에서 Client Secret을 DISCORD_CLIENT_SECRET에 저장하고 Redirects에 다음을 추가합니다.

새사이트주소/api/auth/discord/callback

로컬 확인이 필요하면 http://127.0.0.1:4180/api/auth/discord/callback 도 별도로 등록합니다.

## 4. Gmail 로그인

https://console.cloud.google.com/ 에서 프로젝트를 만들고 Google Auth Platform을 설정합니다.

- Audience: 외부 사용자. 테스트 상태라면 테스트 계정을 추가합니다.
- Clients: 웹 애플리케이션 OAuth 클라이언트 생성.
- 승인된 리디렉션 URI: 새사이트주소/api/auth/google/callback
- Client ID와 Secret을 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET으로 저장합니다.
- 요구 권한은 openid, email, profile뿐이며 Gmail 메일 읽기 권한은 사용하지 않습니다.
- 일반 사용자에게 공개할 때는 동의 화면의 게시 상태도 확인합니다.

## 5. 비밀값 입력

로컬은 commission/.env.example을 .env로 복사해서 채웁니다. .env는 Git에서 제외됩니다. 배포 환경은 Vercel 프로젝트 Settings → Environment Variables에 직접 입력하고 재배포합니다. 토큰과 Client Secret은 채팅이나 GitHub에 올리지 않습니다.

SESSION_SECRET은 충분히 긴 임의 문자열로 설정하고 유지합니다. 이 값으로 포럼 접수 정보도 서명하므로 임의 교체하면 기존 접수가 연결되지 않습니다.

## 6. 공개 전 연결 확인

관리자와 별도 신청자 계정으로 로그인 → 신청 → 비공개 포럼 게시글/멘션 확인 → 관리자 수락·답변 → 신청자 화면 확인 → 대기 중 신청 취소를 확인합니다. 모든 사용자는 답변을 사이트에서 확인합니다. 개인정보 사본을 줄이기 위해 별도 Discord DM은 보내지 않습니다.

포럼 게시글 제목에는 접수 상태 검증 정보가 포함되므로 직접 이름을 바꾸지 않습니다. 게시글을 삭제하면 이력도 사라집니다. 자동 보관된 글도 목록에 포함합니다. 대화는 최근 사이트 메시지 100개까지만 표시하며 디스코드에서 사람이 직접 작성한 메시지는 사이트로 가져오지 않습니다.

마지막으로 site/data/commission.json의 url을 실제 새 주소로 바꾸면 포트폴리오 작업 신청 버튼이 공개됩니다. 현재 로컬에서는 4180 미리보기로 연결됩니다.

## 개인정보 안내와 삭제 기능
실제 접수 전 PRIVACY-OPERATIONS-KO.md의 확인 절차를 완료해야 합니다. CRON_SECRET을 설정하고 개인정보 설정을 확정하기 전에는 OAuth가 있어도 로그인·신청이 열리지 않습니다.
