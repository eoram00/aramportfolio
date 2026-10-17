# Discord 접수 관리

- 검토 중: 기본 작업 포럼, `[검토대기] 제목`
- 수락: `DISCORD_ACCEPTED_FORUM_ID`, `[마감기한] 제목`
- 거절: `DISCORD_REJECTED_FORUM_ID`, `[거절완료] 제목`
- 작업 종류 태그는 대상 포럼의 같은 이름 태그를 사용합니다.
- 수락 버튼은 마감기한과 안내 입력창을, 거부·취소 버튼은 사유 입력창을 엽니다.
- 버튼 처리는 `DISCORD_OWNER_IDS`에 지정된 서버 관리자만 가능합니다.
- Discord의 포럼 간 직접 이동 기능이 없어, 대상 포럼에 신청과 대화를 복사하고 원본에는 이동 링크를 남겨 잠금·보관합니다. 웹의 이전 신청 링크는 새 게시글을 따라갑니다.
- 원본과 이동본 모두 최초 접수 시각을 유지하고 기존 90일 삭제 정책을 따릅니다. 첨부파일은 원본 메시지 링크를 유지합니다.
- 완료되지 않은 복사본은 웹 목록에 표시하지 않습니다. 이동 오류 안내가 뜨면 관리자가 상태와 대상 글을 확인해야 합니다.
- 기존 Google 신청의 미수집 이메일은 소급 조회하지 않습니다. 새 동의 후 Google 로그인한 신청부터 이메일을 표시합니다.

## 서버 설정

`DISCORD_PUBLIC_KEY`는 Discord 애플리케이션 공개 서명 키입니다. 사용자 버튼 요청은 원문 Ed25519 서명, 시각, 애플리케이션, 서버, 관리자 ID를 검증합니다.

Discord Interactions Endpoint URL:
`https://aram-requests.netlify.app/.netlify/functions/discord-interactions`

모달 제출은 즉시 확인 응답을 보내고, 서명된 원문을 background 함수로 전달하여 처리합니다. 별도의 PC 부팅이나 상시 Gateway 프로세스가 필요하지 않습니다.

이전 글 갱신은 해당 배포 이후 `node --env-file=.env.netlify scripts/migrate-forum.js`로 실행합니다. 비밀값이나 신청 내용은 출력하지 않고 건수만 표시합니다.
