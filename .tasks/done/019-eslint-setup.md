# 019 — ESLint setup

**Status:** done
**Created:** 2026-07-06
**Origin:** user-requested (tech debt tracked in STATE.md since early sessions: "Lint не настроен")
**Impact:** medium  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Единственный оставшийся пункт из "Tests / Lint не настроены" техдолга (Vitest закрыт задачей 015). ESLint 9 (flat config) + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh — стандартный стек для Vite+React+TS проекта.

## Context
- Ветка `claude/eslint-setup` создана от `master` (не от `claude/clinician-dashboard-foundation`, которая приостановлена на внешнем Supabase-блокере) — эта задача не связана с dashboard-веткой, независима.
- `npm audit` продолжает показывать 1 high severity vulnerability в `vite@^6.2.0` (Windows-специфичный `server.fs.deny` bypass) — pre-existing, не новая, не тронута этой задачей (вне скоупа: апгрейд vite — отдельное решение, требующее проверки breaking changes).

## Решения (зафиксированы)
- **ESLint 9 flat config** (`eslint.config.js`), не legacy `.eslintrc` — актуальный формат.
- **`typescript-eslint` recommendedTypeChecked** — type-aware правила (a not just syntax-level), раз проект уже строгий (`strict`, `noUncheckedIndexedAccess`) — линтер должен соответствовать той же дисциплине.
- **`eslint-plugin-react-hooks` v7 установлен, но два новых правила отключены**: `react-hooks/refs` и `react-hooks/immutability`. Эти правила — часть React Compiler-ориентированного набора (готовят код к строгим правилам чистоты рендера), и они ошибочно флагуют устоявшийся, рабочий паттерн этого репо: lazy `useState`-инициализатор создаёт стабильный экземпляр контроллера, кэширует в ref, читает в начале рендера (`useBBTSession.ts` и раньше `useHandInteractions.ts`). Проект НЕ использует React Compiler; рефакторить уже работающий, покрытый 37 тестами код ради совместимости с неиспользуемым инструментом — не оправдано для задачи "настроить линтер". Основные правила (`rules-of-hooks`, `exhaustive-deps` через `reactHooks.configs.recommended.rules`) остались включены.
- **`@typescript-eslint/no-unused-vars` понижен до `warn`** (не error) с `argsIgnorePattern: '^_'` — разумный default, не блокирует существующий код резко.
- **MediaPipe `window`-глобалы не давали ложных срабатываний** — они типизированы в `types.ts` (`declare global { interface Window {...} }`), ESLint/typescript-eslint корректно их распознаёт без доп. настройки.
- **`.mjs`-скрипты (`scripts/copy-mediapipe.mjs`) вне текущего покрытия правил** — конфиг фокусируется на `.ts`/`.tsx`; расширение на `.mjs` — при необходимости, отдельная мелкая правка.

## Checklist
- [x] `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` добавлены в devDependencies.
- [x] `eslint.config.js` — flat config, type-aware, React hooks + refresh правила.
- [x] `package.json`: `"lint": "eslint ."`.
- [x] `npm run lint` → 0 errors, 0 warnings на существующей кодовой базе (никакого "первый прогон — 50 ошибок" — репо уже было дисциплинированным).
- [x] `npx tsc --noEmit` чист.
- [x] `npm run test` — 37/37, без регрессий.
- [x] `npm run build` без ошибок.

## Notes
Первый прогон `eslint .` дал ровно 4 ошибки — все от новых `react-hooks/refs`/`react-hooks/immutability` правил на одном и том же устоявшемся паттерне в `hooks/useBBTSession.ts`. Никаких других находок (unused vars, hooks-правила нарушений, TS type-aware проблем) — репо действительно было чистым до этой задачи, просто без формального линтера.

## Verification
- `npm run lint` → exit 0, без вывода.
- `npx tsc --noEmit` → exit 0.
- `npm run test` → `Test Files 6 passed (6)`, `Tests 37 passed (37)`.
- `npm run build` → `✓ built in 639ms`, бандл 220.68 kB (без изменений — ESLint не влияет на production-бандл).

## Retro
**Rating:** _(ожидает оценки пользователя)_
