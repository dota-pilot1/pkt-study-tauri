# DB 동기화

설정의 `DB 동기화` 탭은 로그인할 때 선택한 대상에 따라 한 방향만 노출합니다.

- 로컬로 로그인한 경우: 운영 DB → 로컬 DB
- 배포로 로그인한 경우: 로컬 DB → 운영 DB

## 실행 전 조건

동기화는 앱이 직접 DB 프로토콜을 처리하지 않고, 사용자 컴퓨터에서 다음 명령을 실행합니다.

- `bash`
- PostgreSQL 클라이언트의 `pg_dump`, `pg_restore`
- `ssh`

macOS/Linux 개발 환경을 기준으로 합니다. Windows 배포 앱에서 사용하려면 위 도구를 PATH에 설치해야 합니다.

로컬 DB가 기본 Docker 컨테이너(`sk-pkt-mes-postgres`)로 실행 중이면 앱은 컨테이너 안의 PostgreSQL 도구를 사용합니다. 따라서 호스트에 설치된 `pg_dump` 버전이 달라도 동기화할 수 있습니다. 다른 컨테이너를 사용하면 설정 파일에서 `LOCAL_DB_CONTAINER`를 바꾸고, Docker를 사용하지 않으면 빈 값으로 설정해 호스트 도구를 사용하세요.

접속 설정은 앱에 포함하지 않고 다음 파일에서 읽습니다.

`~/.config/pkt-study/db-sync.env`

예시는 [`db-sync.env.example`](./db-sync.env.example)를 참고하세요. SSH 개인 키와 비밀번호는 Git에 커밋하지 않습니다.

## 안전장치

운영 DB를 로컬로 가져올 때는 기존 로컬 DB를 먼저 다음 경로에 백업합니다.

`~/.local/share/pkt-study/db-backups/`

로컬 DB를 운영으로 반영할 때는 운영 서버에 먼저 백업을 만듭니다.

`/home/ubuntu/sk-pkt-mes/db-backups/`

운영 반영은 데이터 전체를 덮어쓰는 작업이므로, 화면에서 `LOCAL TO PRODUCTION`을 정확히 입력해야 실행됩니다. 동기화 버튼을 누르기 전 대상과 방향을 반드시 확인하세요.
