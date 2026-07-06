# 018 — Clinician dashboard: Supabase-фундамент + auth + patient list

**Status:** blocked (code complete, live verification blocked by external quota — see Notes)
**Created:** 2026-07-06
**Origin:** MVP-план §7 STRATEGY.md, неделя 5 ("Clinician-dashboard: список пациентов, ежедневные графики, заметки клинициста")
**Impact:** high  **Effort:** L  **Risk:** medium (первая инфраструктура с реальным backend + auth в этом репо)
**Blocked by:** Supabase org `selfish-harlequin-zdqlfrw` over free-plan `exceed_db_size_quota` (org-wide, not project-specific — см. Notes)

## Goal
Первый шаг недели 5 MVP-плана. До этой задачи приложение было чисто client-side — BBT-сессии существовали только как одноразовый JSON-скачиваемый файл, без хранения, без клиницистов, без пациентов. Эта задача закладывает инфраструктуру: Supabase-проект, схема (patients + bbt_sessions), RLS, auth (клиницист логинится email+password), маршрутизация (react-router-dom — впервые в этом репо, оправдано: теперь минимум 3 экрана с реальной навигацией, не 2, как раньше при Draw Demo/BBT toggle), и минимальный dashboard (список пациентов + форма добавления пациента).

**Вне скоупа этой задачи** (следующая задача 019): запись реальной BBT-сессии в `bbt_sessions` (сейчас `BBTSessionDemo` всё ещё работает независимо, JSON-экспорт не тронут), история сессий пациента, графики, заметки клинициста.

## Context
- Пользователь подтвердил: Supabase как backend (не local-only) — путь к реальному EHR-интеграционному будущему, описанному в `docs/STRATEGY.md`.
- Пользователь подтвердил: смержить PR #1 (task 013–017) перед началом этой задачи — сделано, `master` теперь содержит весь BBT-функционал.
- Создан новый Supabase-проект `hand-tracking-demo` (ref `slrgjenpvsuxvhqqxwrp`, org `selfish-harlequin-zdqlfrw`, `eu-central-1`, free-план, $0/мес).

## Решения (зафиксированы)
- **Схема:** `public.patients` (id, clinician_id → auth.users, display_name, created_at) + `public.bbt_sessions` (id, patient_id → patients, clinician_id, selected_hand, started_at/ended_at, duration_ms, block_count, avg_*, reps jsonb) — `reps` хранится как jsonb-массив, зеркалит форму `BBTRep[]` из `features/bbtSession.ts` для тривиальной вставки без трансформации.
- **`clinician_id` дублируется на `bbt_sessions`** (не только через join с `patients`) — денормализация ради простых/быстрых RLS-политик (`auth.uid() = clinician_id` без cross-table lookup). Осознанный trade-off, не забывчивость.
- **RLS: `for all using/with check (auth.uid() = clinician_id)`** на обеих таблицах — клиницист видит/пишет только свои записи. `get_advisors(type: security)` — чисто, 0 lint-замечаний.
- **Клиницист = `auth.users` напрямую**, без отдельной profile-таблицы в этой задаче — имя клинициста не нужно нигде в UI ещё (только `auth.uid()` для RLS и текущего email в шапке). Профиль-таблица — если понадобится (например, отображаемое имя клиники) — отдельная задача.
- **react-router-dom добавлен** — первый роутер в этом репо. Раньше (Draw Demo/BBT-переключатель) 2 экрана были осознанно оставлены на локальном `useState` ("оверинжиниринг для двух экранов"). Теперь минимум 4 маршрута (login, dashboard, patient detail, BBT session) с реальной навigацией (deep-link на пациента, back/forward) — порог для роутера пройден.
- **Supabase publishable key (`sb_publishable_...`), не legacy anon key** — новый формат ключей Supabase, тот же API, но актуальный.
- **`.env` (gitignored) + `.env.example` (закоммичен)** — даже хотя publishable-ключ не секретен по дизайну (защита — RLS, не секретность ключа), паттерн env-переменных для URL/ключа — стандартная Vite/Supabase практика, упрощает смену окружения позже.

## Checklist
- [x] Supabase-проект создан, схема применена, RLS включен, advisors чист.
- [x] `@supabase/supabase-js`, `react-router-dom` добавлены в зависимости.
- [x] `.env.example` + `.env` (gitignored) с `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`.
- [x] `lib/supabaseClient.ts` — создаёт клиент из env-переменных.
- [x] `App.tsx` — react-router с маршрутами: `/login`, `/` (dashboard, protected), `/patients/:id` (protected), `/session` (существующий `BBTSessionDemo`, protected).
- [x] Auth: `components/LoginPage.tsx` (email+password через Supabase Auth), простой route-guard (redirect на `/login`, если нет сессии).
- [x] Dashboard: `components/Dashboard.tsx` — список пациентов текущего клинициста, форма "Add patient".
- [x] Patient detail: `components/PatientDetail.tsx` — пока просто имя пациента + пустой список сессий (заглушка, реальные данные — задача 019) + кнопка "Start BBT session".
- [x] `npx tsc --noEmit` чист.
- [x] `npm run test` зелёный (существующие 37 не сломались).
- [x] `npm run build` без ошибок.
- [ ] Dev-сервер/preview: логин-форма рендерится ✅, redirect на `/login` без сессии работает ✅ — но реальная проверка signup/login/patient-CRUD **заблокирована** внешним quota-лимитом (см. Notes). Код готов, живой round-trip не подтверждён.

## Notes
- **Блокер, обнаруженный при первой живой проверке:** `supabase.auth.signUp()` вернул `HTTP 402` с сообщением `exceed_db_size_quota`. Это НЕ баг в коде этой задачи — org `selfish-harlequin-zdqlfrw` (free plan) уже превышает квоту БД из-за данных другого проекта ("Proof", см. память `proof-supabase-project.md`), и квота, судя по всему, применяется на уровне ОРГАНИЗАЦИИ, а не отдельного проекта: `apply_migration` (DDL) на новом, почти пустом `hand-tracking-demo` прошёл без проблем, но первая же data-API операция (auth signup) в НОВОМ проекте всё равно упёрлась в ту же ошибку.
- **Что подтверждено рабочим несмотря на блокер:** схема + RLS-политики применены и корректны (`get_advisors` чист); маршрутизация работает (redirect на `/login` без сессии подтверждён в preview); форма логина/регистрации рендерится и отправляет корректный запрос к Supabase Auth API (сам запрос долетает и получает осмысленный ответ от сервера — значит client-конфигурация, env-переменные, публикуемый ключ — все верны; проблема сугубо на стороне account-квоты).
- **Что НЕ подтверждено:** реальный successful signup → сессия → dashboard → add patient → RLS-изоляция между разными клиницистами. Всё это код-complete, но живой round-trip ждёт разблокировки квоты.
- Варианты разблокировки (за пользователем, не за агентом): (а) дождаться ежемесячного сброса квоты, (б) апгрейд org на Pro-план, (в) освободить место, удалив данные/проекты в "Proof" или других над-квотных проектах, (г) создать `hand-tracking-demo`'s Supabase-проект в ДРУГОЙ организации/аккаунте, не связанной с уже-переполненным `selfish-harlequin-zdqlfrw`.
- **Пользователь выбрал (2026-07-06): ждать ежемесячного сброса квоты или апгрейда на Pro.** Задача приостановлена (не отменена) — код на ветке `claude/clinician-dashboard-foundation`, запушен, PR не открыт. Возобновить: пользователь сообщает, что квота снята/апгрейд сделан → допройти чеклист (реальный signup → dashboard → add patient → RLS-изоляция между клиницистами) → открыть PR.

## Verification
- `npx tsc --noEmit` → exit 0.
- `npm run test` → 37/37 (без регрессий от новых зависимостей).
- `npm run build` → успешно, бандл вырос с 220.68 до ~482 kB (ожидаемо — `@supabase/supabase-js` + `react-router-dom`, никаких предупреждений о размере чанка от Vite).
- Preview: `/` корректно редиректит на `/login` без сессии (`ProtectedRoute` работает); форма логина/регистрации рендерится, переключение sign-in/sign-up работает, submit отправляет реальный запрос к Supabase Auth (`OPTIONS`+`POST .../auth/v1/signup`) — сервер отвечает `402` (quota), не сетевой/конфигурационной ошибкой на нашей стороне.
- Побочно обнаружена и решена stale Vite dep-optimization cache проблема (`Invalid hook call` после добавления новых зависимостей) — `rm -rf node_modules/.vite` + рестарт сервера устранили её полностью (не связано с логикой кода, чисто dev-tooling кэш).
