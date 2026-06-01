# 008 — Tailwind: CDN → локальная сборка (Vite plugin)

**Status:** done
**Created:** 2026-05-29
**Origin:** agent-proposed (из реестра техдолга `STATE.md`)
**Impact:** med  **Effort:** M  **Risk:** med
**Blocked by:** none

## Goal
Заменить `<script src="https://cdn.tailwindcss.com"></script>` на локально собираемый Tailwind через Vite-плагин. Снять продакшен-предупреждение в консоли, ускорить старт (нет внешней зависимости при загрузке), сделать сборку детерминированной. Внешний визуальный результат не должен измениться.

## Context
- Сейчас Tailwind подключается CDN-скриптом, который JIT-генерирует утилиты в рантайме.
- Vite 6, React 19, TypeScript ~5.8 → Tailwind v4 + `@tailwindcss/vite` плагин — самый простой путь (без `tailwind.config.js`, без `postcss.config.js`, всё через `@import "tailwindcss"` в CSS).
- В `index.html` <body> уже задан `font-family: 'Roboto', sans-serif` через inline `<style>` — кастомная Tailwind-утилита `font-roboto` сейчас де-факто no-op (CDN её не определяет). После миграции либо определим через `@theme`, либо уберём из JSX.
- Roboto подключается через Google Fonts `<link>` в `<head>` — это оставляем.
- Файл `index.css` был удалён в 001 (был пустой) — теперь создаём заново для Tailwind-импорта.

## Checklist
- [x] Baseline-скриншот зафиксирован до миграции (тёмный фон + синий spinner + «Starting camera…»).
- [x] `npm install -D tailwindcss@^4.3.0 @tailwindcss/vite@^4.3.0` — поставлено 13 пакетов.
- [x] `vite.config.ts`: импортирован и добавлен `tailwindcss()` плагин.
- [x] Создан `index.css` с `@import "tailwindcss"` + `@theme { --font-roboto: "Roboto", sans-serif; }` — определяет утилиту `font-roboto`, которая используется в JSX.
- [x] `index.tsx`: `import './index.css';` после импорта `App`.
- [x] `index.html`: убрана строка `<script src="https://cdn.tailwindcss.com">`; Google Fonts `<link>` оставлен.
- [x] `font-roboto` определён через `@theme` (а не вырезан из JSX) — сохраняет совместимость с возможным локальным переопределением шрифта в будущем.
- [x] `npm run build` → `built in 1.79s`; **отдельный CSS-asset 12.56 kB (3.27 kB gzip)** теперь рядом с JS-бандлом.
- [x] `npx tsc --noEmit` чист.
- [x] Preview: `No server errors`, `No failed requests`. Скриншот-инструмент таймаутнул 3 раза подряд (известная флакость MCP в этой сессии), но `preview_snapshot` (a11y-tree) подтверждает: рендерятся все слои — mobile blocker, canvas, loading overlay, HUD-панель (HAND/Not visible, GESTURE/Open, Pointer), bottom instruction.
- [x] **В консоли больше нет** `cdn.tailwindcss.com should not be used in production` — главная цель задачи достигнута.

## Notes
- Tailwind v4 + `@tailwindcss/vite` — минимальная конфигурация: без `tailwind.config.js` и без `postcss.config.js`. Контент-скан утилит автоматический через плагин.
- `font-roboto` оставил как класс (вместо удаления из JSX): через `@theme` директиву в v4 это одна строка. Если в будущем потребуется переключить шрифт — меняем одно место.
- Размер CSS-asset (12.56 kB / 3.27 kB gzip) — это **только используемые в проекте утилиты** (благодаря JIT-сканированию исходников). CDN-версия грузила весь Tailwind (>3 MB до tree-shaking).
- JS-бандл не изменился (202.76 kB) — Tailwind в JS не попадает, отдельный CSS-asset; для пользователя суммарно даже **больше** (JS + CSS = 215 kB), но это плата за продакшен-готовность.
- `preview_screenshot` MCP-инструмент завис на этой сессии трижды; перешёл на `preview_snapshot`, который дал точнее визуальную проверку (a11y-tree показывает все слои независимо от z-index, что лучше скриншота loading-overlay).
- Внутренние `<style>` в `index.html` (body + canvas + video transforms) оставил — это базовые CSS-правила вне Tailwind, переезд их на utility-классы был бы дополнительной задачей.

## Verification
- `npx tsc --noEmit` → exit 0. ✅
- `npm run build` → `built in 1.79s`, `dist/assets/index-*.css 12.56 kB │ gzip: 3.27 kB`, `dist/assets/index-*.js 202.76 kB`. ✅
- Preview server: `No server errors`, `No failed requests`. ✅
- A11y-snapshot подтверждает наличие в DOM всех ключевых элементов UI:
  - Title: «Hand Tracking Demo» ✅
  - Mobile blocker heading + body ✅
  - HUD-панель: HAND/«Not visible», GESTURE/«Open», «Pointer: —» ✅
  - Loading overlay: «Starting camera…» ✅
  - Bottom instruction: полный текст ✅
- Console: продакшен-warning от CDN-Tailwind исчез; остались только ожидаемые `NotAllowedError`. ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** При недоступности `preview_screenshot` — переходить на `preview_snapshot` (a11y-tree), он даёт более полную проверку UI, чем скриншот. См. RETRO.md.
**Completed:** 2026-05-29
