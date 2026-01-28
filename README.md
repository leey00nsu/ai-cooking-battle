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
