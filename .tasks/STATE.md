# Состояние проекта

Снимок «где мы сейчас». Читается первой каждую сессию, обновляется каждую сессию.

> **Это не журнал.** История задач — таблица в §6 и файлы `.tasks/done/NNN-*.md`.
> Что делать дальше — `.tasks/BACKLOG.md`. Накопленные уроки — `.tasks/RETRO.md`.
> Держать этот файл коротким: он должен читаться за минуту.

---

## 1. Что это за приложение

Веб-приложение с трекингом рук и лица через камеру. Четыре экрана, переключатель сверху (`App.tsx`):

| Экран | Файл | Назначение |
|---|---|---|
| **BBT Rehab** | `components/BBTSessionDemo.tsx` | **Клиническое ядро.** Box-and-Block-Test: счёт переносов одной рукой, метрики, экспорт JSON |
| **Face Tracking** | `components/FaceTrackingDemo.tsx` | Face Mesh + метрики (моргание, рот, улыбка, наклон) |
| **Hand Filters** | `components/HandFilterDemo.tsx` | Showcase: AR-фильтры на руки/лицо, «экран между руками» (Poster/ASCII/AnimeGAN) |
| **Shooting** | `components/ShootingGameDemo.tsx` | Showcase: игра-стрелялка на жесте «пистолет» |

**Стратегическое направление подтверждено пользователем:** medtech B2B SaaS для реабилитации кисти (`docs/STRATEGY.md` §6/§8, направление 4.1a). BBT — продуктовое ядро; остальные экраны — showcase-трек и **не должны засорять клинический экран**.

## 2. Стек

- **Сборка:** Vite 6 + React 19 + TypeScript ~5.8 (strict, `noUncheckedIndexedAccess`), Tailwind v4 через `@tailwindcss/vite`, lucide-react
- **CV/ML:** `@mediapipe/hands` + `@mediapipe/face_mesh` + camera_utils + drawing_utils — UMD-глобалы, локальные ассеты из `public/mediapipe/` (~40 МБ, регенерируются `postinstall`)
- **AI:** AnimeGANv2 ONNX через `onnxruntime-web` (WebGPU→WASM), инференс в Web Worker. Модель gitignored, ставится `npm run fetch-model`
- **Тесты:** Vitest, `environment: 'node'`, **132 теста в 18 файлах** — только чистый логический слой (`lib/*`, `features/bbtSession`, `features/replay`, `features/shootingGame`)
- **Линт:** ESLint 9 flat config, type-aware. Правила `react-hooks/refs` и `immutability` отключены осознанно (конфликтуют с намеренным паттерном «controller в ref»)

## 3. Команды

```bash
npm run dev          # Vite, порт 3000
npm run build
npm run test         # vitest run
npm run test:watch
npm run lint
npx tsc --noEmit
npm run fetch-model  # скачать AnimeGAN ONNX (нужен для эффекта Anime AI)
npm run postinstall  # регенерировать MediaPipe-артефакты
```

## 4. Определение готовности (DoD)

- [ ] `npx tsc --noEmit` чист
- [ ] `npm run lint` чист
- [ ] `npm run test` зелёный — новая чистая логика в `lib/`/`features/` **обязана** получить тест
- [ ] `npm run build` без ошибок
- [ ] Нет debug-вывода, закомментированного кода, неиспользуемых импортов
- [ ] Проверка в браузере: **через реальный путь приложения**, не через параллельный вызов библиотеки (см. RETRO 13.08)
- [ ] Консоль чистая, кроме ожидаемого `NotAllowedError` от камеры в headless

## 5. Архитектурные инварианты (нарушать нельзя)

1. **Канвас зеркалится** — `index.html`: `canvas { transform: scaleX(-1) }`. Handedness компенсируется в `engine/handEngine.ts` (`SWAP_HANDEDNESS`). Следствия: никакого текста/асимметричных глифов на канвасе; углы квада сортируются по canvas-x, а не по метке руки.
2. **Пороги жестов — только отношения** расстояний одной руки (scale-invariant). Абсолютные значения ломаются при смене дистанции до камеры.
3. **Identity колбэков в effect-deps должна быть стабильной** — иначе пересоздаётся `HandEngine` и перезапускается камера. Мутабельное состояние в ref, читать внутри `useCallback` с `[]`.
4. **Чистая логика тестируется, DOM — нет.** Состояние/математика в `lib`/`features` с синтетическими фикстурами; рисование — в отдельном рендерере.
5. **Clock и RNG инжектируются** для всего временно-/случайно-зависимого; тестировать **и с нулевым началом координат**.
6. **MediaPipe только через `window`-глобалы** — ESM-импорт ненадёжен (осознанное решение, не переделывать).

## 6. История задач

Полные детали и обоснования решений — в `.tasks/done/NNN-*.md`. Здесь только карта.

| # | Задача | Итог |
|---|---|---|
| 001–012 | Зачистка, удаление AI, фильтры One Euro, strict TS, git/remote | Основа |
| 013–014 | BBT измерительный цикл + фиксы с реальной камеры (одна рука, relabel-толерантность) | PR #1 ✅ |
| 015–017 | Vitest, debug-панель, record/replay-механизм | PR #1 ✅ |
| 018 | Clinician dashboard (Supabase) | **Заблокирована квотой**, ветка жива |
| 019 | ESLint | PR #2 ✅ |
| 020 | Face Mesh + метрики лица | PR #3 ✅ |
| 021 | AR-фильтры (реестр как данные) | PR #4 ✅ |
| 022 | Фикс: лицо распознавалось как рука (score-gate) | PR #5 ✅ |
| 023 | «Экран между руками» (квад, аффинная проекция) | PR #6 🔶 открыт |
| 024 | AnimeGANv2 в браузере (WebGPU 49 мс / ~20 fps) | PR #6 🔶 |
| 025 | Игра-стрелялка на жесте «пистолет» | PR #6 🔶 |
| 026 | Фикс [HIGH]: устойчивый relabel в BBT | ✅ закрыта |
| 027 | Фаза 0.1 шутера: снять зеркало с игрового слоя | ✅ закрыта |
| 028 | Фаза 0.2–0.4 шутера: спрайты, AudioBus, rAF | ✅ закрыта |
| 029 | Grace-период для сглаживания квада в SceneEffectRenderer | ✅ закрыта |
| 030 | Confidence-hardening для FaceEngine | ✅ закрыта |
| 031 | Дедупликация HudRow, download.ts, RawHandFrame, зачистка экспортов | ✅ закрыта |
| 032 | Прицел: курсор вместо луча + сглаживание (фикс тряски и «не туда стреляет») | ✅ закрыта |

**Аудит 10.07** (все замечания устранены в задачах 026–031).

## 7. Куда смотреть дальше

| Вопрос | Файл |
|---|---|
| Что делать следующим? | `.tasks/BACKLOG.md` |
| Какие грабли уже собраны? | `.tasks/RETRO.md` ← **читать до кода** |
| Правила воркспейса, DoD | `.agents/AGENTS.md` |
| Зачем этот проект существует | `docs/STRATEGY.md` |
| План шутера + промпт для агента | `docs/SHOOTER-ROADMAP.md` |
| Промпты для генерации ассетов | `docs/ASSET-PROMPTS.md` |
| Конвенции и ложные срабатывания для аудита | `.code-quality/PROJECT-CONTEXT.md` |
