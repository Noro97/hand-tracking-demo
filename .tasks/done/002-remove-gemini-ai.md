# 002 — Удалить интеграцию с Google Gemini AI

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested
**Impact:** high  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Полностью изъять зависимость от Google Gemini API и связанный AI-код. После задачи в репозитории нет ни одного упоминания `@google/genai`, `getStrategicHint`, `API_KEY`. Игровая логика временно продолжает работать (без подсказок).

## Context
- Точка интеграции: `services/geminiService.ts` (203 строки).
- `vite.config.ts` пробрасывает `process.env.API_KEY` и `GEMINI_API_KEY` из `.env.local`.
- `.env.local` содержит placeholder `GEMINI_API_KEY=PLACEHOLDER_API_KEY`.
- `package.json` зависимость: `"@google/genai": "^1.31.0"`.
- В `GeminiSlingshot.tsx`: импорт `getStrategicHint, TargetCandidate`; state-переменные `isAiThinking`, `aiHint`, `aiRationale`, `aiRecommendedColor`, `debugInfo`, `aimTarget`, `availableColors`; функции `performAiAnalysis`, `getAllReachableClusters`; ref `captureRequestRef`, `isAiThinkingRef`, `aimTargetRef`; правая UI-панель Flash Strategy + Debugger; вызов screenshot в конце render-цикла.
- В `types.ts`: `StrategicHint`, `DebugInfo`, `AiResponse`.

## Checklist
- [x] Удалить `services/geminiService.ts`; папка `services/` опустела — удалена.
- [x] Удалить `.env.local`.
- [x] Из `vite.config.ts` убрать секцию `define` с `process.env.API_KEY` и `process.env.GEMINI_API_KEY` + неиспользуемый `loadEnv` import.
- [x] Из `package.json` снять `@google/genai`; `package-lock.json` перегенерирован (`npm install`, удалено лишних 98 пакетов).
- [x] Из `GeminiSlingshot.tsx` убраны: импорт `getStrategicHint`/`TargetCandidate`, AI state и refs (`isAiThinking`, `aiHint`, `aiRationale`, `aiRecommendedColor`, `debugInfo`, `aimTarget`, `isAiThinkingRef`, `aimTargetRef`, `captureRequestRef`), функции `performAiAnalysis` и `getAllReachableClusters`, screenshot-блок в конце render, лазерный прицел (`shouldShowLine`, dashed line, target ring), recommended-color бейдж в палитре, правая панель (Flash Strategy + Debugger), `isAiThinking` overlay, иконки `BrainCircuit`/`Eye`/`Terminal`/`AlertTriangle`/`Target`/`Lightbulb` из импорта, `isLocked` лочка в логике пинча.
- [x] Из `types.ts` убраны `StrategicHint`, `DebugInfo`, `AiResponse`, `Vector` (не использовался), `isFloating` поле `Bubble`.
- [x] Из `index.html` убрана запись `@google/genai` в importmap.
- [x] grep по `genai|getStrategicHint|GoogleGenAI|GEMINI_API_KEY|API_KEY|StrategicHint|AiResponse|TargetCandidate` — ноль совпадений вне `.tasks/`, `node_modules/`, `dist/`, `package-lock.json`.
- [x] `npx tsc --noEmit` — чисто.
- [x] `npm run build` — `built in 1.73s`, бандл `209.61 kB` (с 515.39 kB до удаления AI SDK).
- [x] Dev-сервер: после рестарта `No server errors`, `No failed requests`; в браузере только ожидаемые `NotAllowedError: Permission denied`.

## Notes
- Бандл уменьшился c **515.39 kB → 209.61 kB** (gzip: 127.94 → 66.38 kB). Предупреждение о размере чанка >500 kB ушло — можно убрать из реестра техдолга.
- Из `vite.config.ts` убрал и неиспользуемый `loadEnv` импорт, не только секцию `define` — после удаления `define` `loadEnv` стал мёртвым.
- В `types.ts` удалил также `Vector` (нигде не используется в оставшемся коде) и поле `isFloating?: boolean` у `Bubble` (тоже нигде не выставлялось). Это в пределах scope «убрать AI-типы», т.к. это попутный мёртвый код.
- Промежуточная гонка: вначале удалил `services/geminiService.ts` и только потом переписал `GeminiSlingshot.tsx` → Vite пытался два раза транспилировать файл со старым импортом и сыпал `Internal server error` в логи. После перезапуска dev-сервера всё чисто. **Урок:** при удалении импортируемого файла сначала чистить импорт в потребителях, потом удалять файл — иначе HMR пишет шум в логи.

## Verification
- `npx tsc --noEmit` → exit 0. ✅
- `npm run build` → `✓ built in 1.73s`, `dist/assets/index-D0dO9MGZ.js 209.61 kB │ gzip: 66.38 kB`. ✅
- Grep по AI-ключам → пусто. ✅
- Dev server (после рестарта): `No server errors found`, `No failed requests`. ✅
- Console: только `NotAllowedError: Permission denied` (ожидаемо в headless). ✅
- Нет постороннего debug-вывода: проверено grep'ом, чисто.

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** Порядок при удалении импортируемого файла: сначала очистить импорты у потребителей, потом удалять файл. См. RETRO.md.
**Completed:** 2026-05-29
