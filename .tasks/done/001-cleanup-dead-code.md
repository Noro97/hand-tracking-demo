# 001 — Очистка мёртвого кода и шаблонных артефактов

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Убрать то, что уже мёртво сегодня, ДО рефакторов AI/игры: шаблонный README от AI Studio, пустой `index.css`, неиспользуемые импорты в `GeminiSlingshot.tsx`, проверить `metadata.json`. Не трогаем AI и игровой код — для них отдельные задачи 002/003.

## Context
- `README.md` — шаблон Google AI Studio с битой ссылкой `ai.studio/apps/bundled/gemini_slingshot`.
- `index.css` — пустой файл (0 байт), подключается из `index.html` через `<link rel="stylesheet" href="/index.css">`.
- `metadata.json` — 252 байта, шаблонный артефакт AI Studio.
- `GeminiSlingshot.tsx` импортирует много иконок `lucide-react`; часть, возможно, не используется (`MousePointerClick`, `Eye`, `Terminal`, `Clock`, `AlertTriangle`, `Target`, `Lightbulb`, `Monitor`, `BrainCircuit`, `Trophy`, `Play`, `Loader2`).
- SPDX-заголовки в `services/geminiService.ts` и `types.ts` — лицензионный шум от шаблона; оставим, безопаснее не трогать.

## Checklist
- [x] Прогнать grep по `GeminiSlingshot.tsx` на каждую иконку из импорта; удалить неиспользуемые.
- [x] Проверить `index.css` — если пустой, удалить + убрать `<link>` из `index.html`.
- [x] Проверить `metadata.json` — если шаблонный/неиспользуемый, удалить.
- [x] Переписать `README.md` на минимальный: что это, как запустить, известные ограничения. Без ссылок на AI Studio.
- [x] `npx tsc --noEmit` — без ошибок.
- [x] `npm run build` — без ошибок.

## Notes
- Из 12 импортированных иконок lucide-react мёртвой оказалась только `Clock`. Остальные 11 ещё используются в AI-панелях (002) и игровом UI (003) — они будут срезаны соответствующими задачами вместе со своими секциями.
- `metadata.json` — шаблонный артефакт AI Studio (имя «Gemini Slingshot», запрос камеры). Vite его не использует. Удалён.
- `index.css` был размером 0 байт. Удалён файл и `<link>` в `index.html`.
- README переписан в минимальный честный вариант (с пометкой о текущем рефакторе). Будет ещё раз обновлён в 003 после финального состояния.
- Сборка выдаёт предупреждение «chunk larger than 500 kB» — это про bundle (MediaPipe + Gemini). После 002 размер уменьшится; пометка в техдолге уже не нужна, фиксируется естественно.

## Verification
- `npx tsc --noEmit` → exit 0, без вывода. ✅
- `npm run build` → `built in 2.74s`, `dist/assets/index-*.js 515.39 kB`. Warning о размере чанка — не блокер (предсуществующий). ✅
- Preview-консоль: только ожидаемые `NotAllowedError: Permission denied` от камеры в headless; нет 404 от удалённых файлов. ✅
- Нет постороннего debug-вывода / закомментированного кода: не вносили.

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** Минимальная подготовительная зачистка как отдельная задача перед большими рефакторами — подтверждённый подход. См. RETRO.md.
**Completed:** 2026-05-29
