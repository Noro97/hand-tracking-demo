# 026 — Фикс: устойчивый handedness-relabel навсегда блокирует новые повторы BBT

**Status:** done
**Created:** 2026-08-21
**Origin:** Аудит от 2026-07-10 (`.code-quality/reports/review-20260710-183850.md`)
**Impact:** high (клиническое ядро)  **Effort:** S  **Risk:** low
**Blocked by:** none

## 1. Проблема
`handleGestureStart` в `features/bbtSession.ts` гейтил старт нового повторения проверкой `if (handedness !== this.state.selectedHand) return;`.
При старте сессии `this.state.selectedHand` устанавливался один раз (например, `'Left'`). Если во время первого повторения классификатор MediaPipe флипал метку руки на `'Right'`, метод `tryResumeFromCandidate` подтверждал ту же физическую руку по близости координат (`RESUME_PROXIMITY_PX`) и обновлял `this.trackedHandedness = 'Right'`. Первое повторение успешно завершалось.

Однако `this.state.selectedHand` оставался равным `'Left'`. Когда пользователь под этой же рукой (которую MediaPipe теперь стабильно распознаёт как `'Right'`) начинал повторение 2, условие `handedness !== this.state.selectedHand` (`'Right' !== 'Left'`) срабатывало и молча сбрасывало жест. Все последующие повторения игнорировались до конца сессии.

## 2. Решение
В `tryResumeFromCandidate` (`features/bbtSession.ts`):
- При успешном возобновлении по близости координат обновлять `this.state = { ...this.state, selectedHand: this.trackedHandedness }` и вызывать `this.onStateChange(this.state)`.
- Добавлен тест в `features/bbtSession.test.ts`, проверяющий сценарий двух повторений, где после relabel во время первого повторения второе повторение совершается под новой меткой и корректно инкрементирует `blockCount` до 2.

## 3. Checklist
- [x] Обновить `tryResumeFromCandidate` в `features/bbtSession.ts`
- [x] Добавить тест в `features/bbtSession.test.ts`
- [x] `npm run test` (116 тестов в 15 файлах)
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 4. Verification
- `npm run test` → 116/116 passed
- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → built in 1.50s
