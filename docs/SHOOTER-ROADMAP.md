# Дорожная карта: от жеста-пистолета к полноценному шутеру

**Дата:** 2026-08-14
**Статус:** план, ни одна фаза не начата
**Отправная точка:** задача 025 — рабочий прототип (поза пистолета, прицел-луч, hitscan, мишени-круги, счёт/точность)

> Язык: тело документа — русский по конвенции репозитория (см. `.tasks/RETRO.md`). Промпт для агента — английский, как и `.agents/AGENTS.md`: он адресован кодовому агенту и ссылается на английские идентификаторы.

---

## 1. Что уже есть (переиспользовать, НЕ переписывать)

| Блок | Файл | Что даёт |
|---|---|---|
| Поза пистолета | `lib/pistolPose.ts` | Разгибание пальцев через **отношения** расстояний → scale-invariant |
| Прицел + попадание | `lib/aiming.ts` | Луч из кончика пальца, ray/circle hitscan |
| Спуск | `lib/filters.ts::PinchTracker` | Гистерезис + дебаунс = готовый триггер, один выстрел на нажатие |
| Сглаживание | `lib/filters.ts::OneEuroFilter` | Гасит дрожание landmarks |
| Состояние игры | `features/shootingGame.ts` | Инжектируемые clock+RNG → детерминированные тесты |
| Рендер | `features/shootingGameRenderer.ts` | Отделён от логики, только пиксели |
| Edge-события жестов | `lib/gestureEventDispatcher.ts` | start/end из булевых состояний |
| Реестр как данные | `lib/filterRenderers.ts` | Образец: добавление сущности = правка данных, не ветвлений |

**Правило:** каждая новая механика сначала ищет себе место среди этих примитивов. `PinchTracker` уже дважды оказался ровно тем, что нужно (pinch, затем спуск) — вероятно окажется и для «перезарядки».

---

## 2. Блокеры, которые надо снять ДО текстур

### 2.1 Зеркало канваса — критично

`index.html` задаёт `canvas { transform: scaleX(-1) }` глобально. Игровой канвас это наследует. Поэтому текущий рендерер намеренно рисует **только симметричные фигуры и никакого текста** — иначе всё читается задом наперёд.

Любая текстура с буквами, цифрами, асимметричным силуэтом (враг, смотрящий влево; логотип; HUD-цифры в канвасе) **отрисуется зеркально**. Это не косметика — это делает спрайты непригодными.

**Решение:** снять зеркало с ИГРОВОГО слоя и зеркалить вместо этого координаты.
- CSS: игровому канвасу `transform: none`.
- Ввод: при переводе landmarks в игровые координаты применять `x → width - x`; для луча — `origin.x → W - origin.x` И `direction.x → -direction.x`.
- Чистая функция `mirrorX(point|ray, width)` + тесты, обязательно тест «прицел совпадает с пальцем, который видит пользователь».

Порядок важен: пока это не сделано, каждая добавленная текстура будет неправильной.

### 2.2 Разделить темп ввода и темп рендера

Сейчас игра тикает внутри `onFrame` камеры (~30 Гц, нестабильно). Для анимации спрайтов, частиц и тряски экрана нужен **отдельный `requestAnimationFrame`-цикл** с накоплением dt:
- камера → только **ввод** (позы, выстрелы),
- rAF → **симуляция + рендер** с фиксированным шагом.

Иначе анимации привязаны к частоте детекции и «плывут» при просадке. Прецедент в репозитории уже есть: таймер BBT-сессии сознательно отвязан от кадров камеры (задача 013).

---

## 3. Фазы

### Фаза 0 — Фундамент (без него остальное бессмысленно)
- [ ] **0.1** Снять зеркало с игрового слоя + `mirrorX` + тесты *(блокирует всё визуальное)*
- [ ] **0.2** `lib/spriteSheet.ts` — загрузчик атласа: preload с прогрессом, кадры анимации, **graceful fallback на текущие векторные фигуры, если ассетов нет** (как AnimeGAN деградирует без модели)
- [ ] **0.3** `lib/audioBus.ts` — Web Audio, пул семплов, разблокировка `AudioContext` по клику Start (autoplay-политика), глобальный mute
- [ ] **0.4** rAF-цикл симуляции, отвязанный от камеры (см. 2.2)
- [ ] **0.5** Решить судьбу ассетов: `public/textures/` + `public/audio/`, gitignore или коммит? *(прецедент: MediaPipe и модель AnimeGAN — gitignored + скрипт)*

### Фаза 1 — Ощущение выстрела («juice»)
- [ ] **1.1** Система частиц (чистая, тестируемая): дульная вспышка, искры попадания, дым
- [ ] **1.2** Тряска экрана + hit-stop (микро-пауза на попадании)
- [ ] **1.3** Всплывающие очки над целью (`+100`, `x3`) — **возможно только после 0.1**
- [ ] **1.4** Спрайтовые мишени с кадрами: idle → hit → death
- [ ] **1.5** Звук: выстрел, попадание, промах, перезарядка, разрушение

### Фаза 2 — Игровые системы
- [ ] **2.1** Волны + кривая сложности (реестр волн как данные)
- [ ] **2.2** Типы врагов: статичный / движущийся / быстрый-мелкий / бронированный (2 попадания) / **бомба, в которую нельзя стрелять** (штраф — даёт цену ошибке)
- [ ] **2.3** Патроны + перезарядка жестом *(кандидат: `PinchTracker` на «рывке» кисти)*
- [ ] **2.4** Жизни/здоровье, конец игры
- [ ] **2.5** Комбо-множитель за серию попаданий

### Фаза 3 — Интерактивность сверх стрельбы
- [ ] **3.1** **Навигация меню жестами** (наведение пальцем + щипок = выбор) → игра полностью без мыши
- [ ] **3.2** Две руки = два пистолета (архитектура уже per-hand)
- [ ] **3.3** Спецатака: раскрытая ладонь → ударная волна, с кулдауном
- [ ] **3.4** **Экран калибровки** — ползунки порогов (`EXTENDED_RATIO`, `TRIGGER_ENTER_REL`, дебаунс) с живым превью. *Высокая ценность: пороги калибровались вручную в задачах 009/014/022/025 — пора отдать это пользователю*

### Фаза 4 — Мета
- [ ] **4.1** Рекорды в `localStorage`
- [ ] **4.2** Пауза (жест или кнопка)
- [ ] **4.3** Обучение: первая волна учит позе и спуску
- [ ] **4.4** Настройки: громкость, качество частиц, дальтонизм, `prefers-reduced-motion`

### Фаза 5 — Полировка
- [ ] **5.1** Профилирование: удержать ≥25 fps с камерой + частицами; бюджет аллокаций на кадр
- [ ] **5.2** Сжатие ассетов (WebP/AVIF, спрайт-атлас одним файлом)
- [ ] **5.3** Обновить `.code-quality/PROJECT-CONTEXT.md` (сейчас устарел — описывает удалённые файлы)

---

## 4. Откуда брать текстуры

| Путь | Плюс | Минус |
|---|---|---|
| Нарисовать/купить PNG-атлас | Полный контроль, лучшее качество | Нужен художник/деньги |
| Сгенерировать ИИ-картинки офлайн | Быстро, дёшево | Нужна ручная вырезка альфы, стилевая несогласованность |
| Оставить векторную графику canvas | Ноль ассетов, идеальный масштаб | Не «кастомные текстуры» в смысле запроса |

**Рекомендация:** заложить загрузчик (0.2) с fallback на вектор. Тогда игра работает всегда, а текстуры подключаются по мере готовности — не блокируя разработку механик.

---

## 5. Не забыть (открытый долг)

- **[HIGH] `features/bbtSession.ts`** — устойчивый handedness-relabel навсегда блокирует новые повторы (аудит 10.07, не исправлено)
- **[MEDIUM] `lib/sceneEffects.ts`** — сглаживание квада сбрасывается при потере руки на один кадр
- `.code-quality/PROJECT-CONTEXT.md` устарел

---

## 6. Промпт для кодового агента

> Копировать целиком в новую сессию. Написан по-английски намеренно — адресован агенту, ссылается на английские идентификаторы (прецедент: `.agents/AGENTS.md`).

```
You are continuing work on /Users/norayravetisyan/Desktop/projects/hand-tracking-demo —
a Vite + React 19 + TypeScript webcam app using MediaPipe Hands and Face Mesh.
It already contains a working pistol-gesture shooting prototype. Your goal is to
grow it into a complete shooter game with custom textures, sound, and full
gesture interactivity.

READ FIRST, IN THIS ORDER:
  1. .tasks/STATE.md          — current state, decisions log, tech debt
  2. .tasks/RETRO.md          — accumulated lessons; these OVERRIDE your defaults
  3. .agents/AGENTS.md        — workspace rules (DoD, language, architecture)
  4. docs/SHOOTER-ROADMAP.md  — the phased plan you are executing
  5. .tasks/done/025-shooting-game.md — how the current prototype works

NON-NEGOTIABLE CONSTRAINTS (learned the hard way in this repo):

* THE CANVAS IS MIRRORED. index.html applies `canvas { transform: scaleX(-1) }`
  globally. Any sprite containing text or an asymmetric silhouette renders
  BACKWARDS. Phase 0.1 (un-mirror the game layer, mirror coordinates instead)
  MUST land before you add a single texture. Do not skip it.

* SCALE-INVARIANT THRESHOLDS ONLY. Every gesture threshold must be a RATIO of
  two same-hand distances (see lib/pistolPose.ts, lib/geometry.ts::handSize).
  Absolute pixel/normalized distances break as the hand moves toward or away
  from the camera.

* CALLBACK IDENTITY MUST BE STABLE. Anything passed into useHandTracking's
  callbacks is in a useEffect dependency array. An unstable identity recreates
  HandEngine and RESTARTS THE CAMERA. Keep mutable state in a ref, read it
  inside a `[]`-deps useCallback (see hooks/useActiveFilters.ts,
  hooks/useFrameRecorder.ts).

* PURE LOGIC IS TESTED, DOM CODE IS NOT. Game state, math and pose logic live
  in lib/ or features/ with Vitest tests using synthetic landmark fixtures.
  Canvas drawing lives in a separate renderer module. There is no camera in
  headless testing — never claim gesture behavior is verified without one.

* INJECT CLOCK AND RNG for anything time- or random-dependent, and TEST WITH A
  ZERO-ORIGIN CLOCK. A bug shipped because `lastSpawnAt = 0` only worked due to
  Date.now() being large (see .tasks/RETRO.md, 2026-08-14).

* VERIFY THROUGH THE APP'S REAL PATH. Import the actual module the app uses
  (e.g. `import('/features/shootingGame.ts')` in the browser console via the
  preview tools) — not the underlying library. A parallel "direct" test proves
  the library exists, not that the feature works (see RETRO, 2026-08-13).

* REUSE BEFORE BUILDING. PinchTracker (hysteresis + debounce) and OneEuroFilter
  (jitter smoothing) already solve most gesture problems. GestureEventDispatcher
  converts per-frame booleans into start/end edges. Check these first.

WORKFLOW:
  - Use the task-pr-flow skill: one task -> one branch -> one PR.
  - Write a .tasks/NNN-*.md file per task, in RUSSIAN, recording DECISIONS and
    their reasoning, not just a checklist.
  - Definition of Done (.tasks/STATE.md): `npx tsc --noEmit`, `npm run lint`,
    `npm run test`, `npm run build` all clean, plus a browser check.
  - Append a lesson to .tasks/RETRO.md whenever something non-obvious bites you.

SCOPE FOR THIS SESSION: execute Phase 0 of docs/SHOOTER-ROADMAP.md
(0.1 un-mirror -> 0.2 sprite loader -> 0.3 audio -> 0.4 rAF loop). Land 0.1 as
its own PR before anything else, since every later visual task depends on it.
Ask me before choosing the art/asset direction (0.5) — that is my call, not
yours.

Be honest about what you could not verify without a real camera. Do not report
gesture behavior as working when you have only checked that it compiles.
```

---

## 7. Как этим пользоваться

1. Открыть новую сессию агента в корне репозитория.
2. Вставить промпт из §6 целиком.
3. Агент читает `STATE.md`/`RETRO.md`/этот файл и начинает с фазы 0.1.
4. После каждой фазы — тест на **реальной камере**: headless не видит ни жестов, ни попадания текстур.
5. Вопрос §4 (откуда текстуры) решает пользователь — агенту сказано спросить.
