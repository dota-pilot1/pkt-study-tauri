# SK PKT MES 개발 학습 앱 릴리즈

## 주소

- 저장소: `dota-pilot1/sample-pkt-project`
- API: GitHub Actions Secret `VITE_API_BASE`
- 로컬 API: `http://localhost:4201`
- 개발 웹뷰: `http://localhost:4200`

API 주소를 바꿀 때는 `VITE_API_BASE` 환경변수와
`src-tauri/capabilities/default.json`의 허용 origin을 함께 확인합니다.

## 자동 업데이트

릴리즈는 이 저장소의 `v*` 태그를 기준으로 생성됩니다.
설치된 앱은 GitHub Release의 `latest.json`을 조회해 업데이트합니다.

## GitHub Actions Secrets

필수:

- `TAURI_SIGNING_PRIVATE_KEY`
- `VITE_API_BASE` = `https://api.hibot-docu.com/api`

선택:

- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## 첫 릴리즈 준비

1. 저장소 Secrets에 `TAURI_SIGNING_PRIVATE_KEY`를 이 앱 전용으로 등록합니다.
2. 운영 API를 사용할 경우 `VITE_API_BASE`도 등록합니다. 비워두면 앱은 기본값인
   `http://localhost:4201`을 사용하므로 로컬 개발용 릴리즈가 됩니다.
3. 서명 키 비밀번호를 설정했다면 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`도 등록합니다.
4. `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전을 같은 값으로 올리고 태그를 푸시합니다.

```bash
git tag v0.1.21
git push origin v0.1.21
```

GitHub Actions가 Windows 설치 파일과 macOS universal DMG, updater `latest.json`을 자동으로
GitHub Release에 게시합니다. 일반 브랜치 push는 릴리즈를 실행하지 않습니다.
