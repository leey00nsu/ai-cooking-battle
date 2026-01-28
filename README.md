## AI Cooking Battle Project

Next.js 기반의 AI 요리 배틀 웹 애플리케이션입니다.

## 실행 방법

```bash
pnpm dev
```

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
