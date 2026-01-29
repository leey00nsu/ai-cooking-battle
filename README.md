## AI Cooking Battle Project

Next.js 기반의 AI 요리 배틀 웹 애플리케이션입니다.

## 실행 방법

### 1) 환경 변수 설정

```bash
cp .env.example .env.local
```

- `BETTER_AUTH_URL` 은 OAuth 리다이렉트 URL 기준이 됩니다. 로컬에서는 `http://localhost:3000` 으로 맞춰주세요.

### 2) Postgres 실행

```bash
docker compose up -d
```

### 3) Prisma 준비

```bash
pnpm db:generate
pnpm db:migrate:dev
```

### 4) 개발 서버 실행

```bash
pnpm dev
```

> `predev`에서 `pnpm db:generate`가 자동 실행됩니다.

### 프로덕션 start 전 마이그레이션

```bash
pnpm start
```

> `prestart`에서 `pnpm db:migrate:deploy` + `pnpm db:generate`가 자동 실행됩니다.

### OAuth 콘솔 등록용 리다이렉트 URL

아래 리다이렉트 URL을 각 프로바이더 콘솔에 등록해야 합니다.

- Google: `{BETTER_AUTH_URL}/api/auth/callback/google`
- Naver: `{BETTER_AUTH_URL}/api/auth/callback/naver`
- Kakao: `{BETTER_AUTH_URL}/api/auth/callback/kakao`

### OAuth 환경변수 발급 방법

#### Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)

1. Google Cloud Console의 **Clients** 페이지에서 OAuth 클라이언트를 생성합니다.
2. 생성/편집 화면에서 리다이렉트 URL을 등록합니다.
3. **Clients** 페이지에서 Client ID/Secret을 확인합니다.

#### Naver (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)

1. Naver Developers의 **Application → 애플리케이션 등록**에서 앱을 등록합니다.
2. 등록 후 **내 애플리케이션 → 개요**에서 Client ID/Client Secret을 확인합니다.
3. **로그인 오픈 API 서비스 환경**에서 PC웹/모바일웹 콜백 URL을 등록합니다.

#### Kakao (KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET)

1. Kakao Developers 앱 관리 페이지에서 **[App] → [Platform key] → [REST API key]**로 Client ID에 해당하는 REST API 키를 확인합니다.
2. 같은 화면에서 Client Secret을 확인/발급해 `KAKAO_CLIENT_SECRET`에 입력합니다.
3. 같은 위치에서 Redirect URI를 등록합니다.

## 품질 도구

이 프로젝트는 Biome을 사용해 lint/format을 수행합니다.

```bash
pnpm lint
```

### Git Hooks

- `pre-commit`: lint-staged로 변경된 파일만 검사/포맷합니다.
- `pre-push`: `pnpm lint`, `pnpm typecheck`, `pnpm build`가 모두 성공해야 push가 가능합니다.

## 기타

문서 및 기능 설계는 `docs/`를 참고하세요.
