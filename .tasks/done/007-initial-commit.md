# 007 — Первичный git commit

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested (через «init git» + последующее планирование)
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** none (блок снят: user настроил `git config --global` идентичность)

## Goal
Зафиксировать всё текущее состояние проекта одним осмысленным первичным коммитом. После задачи у репозитория есть `main` branch (или `master`, в зависимости от дефолта git) с одним коммитом, содержащим: hand-tracking demo, postinstall-инфраструктуру, переименованный пакет, `.tasks/` со всей сессионной историей, и `docs/STRATEGY.md`.

## Context
- `git init` уже сделан в предыдущей сессии; история пуста.
- `.gitignore` корректен: `node_modules/`, `dist/`, `public/mediapipe/`, `*.local`, редакторские артефакты.
- `package-lock.json` в свежем виде (после ренейма).
- В репо нет sensitive-файлов: `.env.local` удалён в 002, ключей нигде нет.
- Имя ветки: пусть будет дефолтное от git (на современных версиях — `main`; на старых — `master`). Не меняем явно.

## Checklist
- [x] `git status` чист — untracked был только список из 15 ожидаемых записей, `public/`/`node_modules/`/`dist/` не светились.
- [x] `git add` поимённо (без `-A`): `.claude .gitignore .tasks App.tsx README.md components docs index.html index.tsx package-lock.json package.json scripts tsconfig.json types.ts vite.config.ts`.
- [x] После `add`: 25 файлов в индексе, public/mediapipe/ корректно скрыт `.gitignore`.
- [x] `git commit` с многострочным HEREDOC-сообщением, описывающим состояние и историю задач 001–006.
- [x] `git log --oneline` → один коммит `f6d9617 chore: initial commit`.
- [x] `git ls-files | wc -l` → **25** tracked-файлов.

## Notes
- Stage готов: 25 файлов добавлены через `git add` (без `-A`, поимённо).
- Первая попытка `git commit` упала: `fatal: unable to auto-detect email address (got 'Others@DESKTOP-GBOS75U.(none)')`.
- По правилам безопасности агент не правит `git config`. Запросил у пользователя настройку идентичности; пользователь сделал `git config --global` и подтвердил «done».
- Stage сохранился между сессиями (нормально для git index), повторного `add` не потребовалось.
- Множественные warning'и `LF will be replaced by CRLF` в выводе `git add` — стандарт Windows-git'а при `core.autocrlf=true`, не блокер. Если в будущем потребуется единообразие переводов строк — отдельная задача про `.gitattributes`.

## Verification
- `git log --oneline` → `f6d9617 chore: initial commit` ✅
- `git ls-files | wc -l` → 25 ✅
- `git ls-files | grep mediapipe` → пусто (артефакты корректно скрыты `.gitignore`) ✅
- `git status` после коммита → working tree clean ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** В задачах на первичный `git commit` — проверять `git config user.email/user.name` ДО `git add`, чтобы пользователь увидел блок на этапе планирования, а не выполнения. См. RETRO.md.
**Completed:** 2026-05-29

## Verification
_(заполняется на шаге 5)_
