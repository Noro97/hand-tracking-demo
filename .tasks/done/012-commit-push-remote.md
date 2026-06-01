# 012 — Follow-up commit + создание GitHub remote + push

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested («commit and push into new remote repo»)
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Закоммитить всё накопленное после initial commit `f6d9617` (задачи 008–011 + meta-апдейты `.tasks/`), создать новый публичный GitHub repo `Noro97/hand-tracking-demo` и запушить туда.

## Решения (зафиксированы)
- **Имя remote'а:** `hand-tracking-demo` (совпадает с npm-пакетом после задачи 006).
- **Visibility:** Public (portfolio/demo-проект; стратегический бриф в `docs/STRATEGY.md` пользователь согласился разместить в репо при bootstrap; не sensitive).
- **Структура коммитов:** один follow-up commit, описание перечисляет задачи 008–011. Не разбиваем по задачам — это посткоммитная реконструкция, временные метки не реальные.

## Checklist
- [x] `git add .` → 25 файлов в индексе (14 modified, 5 added, 1 deleted, 5 new — including hooks/lib).
- [x] `git status --short` — sanity-check прошёл; `node_modules`, `dist`, `public/mediapipe` корректно скрыты `.gitignore`.
- [x] `git commit -m` с многострочным HEREDOC; коммит `a1a0d20 chore: post-init refactor and strategy expansion`.
- [x] `gh repo create Noro97/hand-tracking-demo --public --source=. --remote=origin --push --description="..."` — remote создан и push'ен одной командой.
- [x] Push успешен: `[new branch] HEAD -> master`, branch tracks `origin/master`.
- [x] `gh repo view --json` подтверждает PUBLIC + описание + default branch `master`.
- [x] `git log --oneline`: два коммита (`f6d9617` + `a1a0d20`).

## Notes
- **URL:** https://github.com/Noro97/hand-tracking-demo
- **Default branch — `master`**, не `main`. GitHub современный дефолт — `main`, но локальный git на Windows-машине пользователя создал `master` (legacy git default). Если хотите переименовать в `main` — отдельная мелкая задача:
  ```
  git branch -m master main
  git push -u origin main
  gh repo edit Noro97/hand-tracking-demo --default-branch main
  git push origin --delete master
  ```
- **CRLF warnings** при `git add` — стандартный шум Windows-git'а при `core.autocrlf=true`. Не блокер, фиксируется через `.gitattributes` (отдельная задача из техдолга).
- **Что попало в remote:**
  - 25 файлов исходного кода + конфигов
  - `.tasks/` со всей историей задач 001–012 (`active/012` пока в этом коммите, переедет в `done` после рейтинга — следующим коммитом)
  - `docs/STRATEGY.md` (публично — пользователь подтвердил Public при моих рекомендациях)
- **Что НЕ попало (корректно):** `node_modules/`, `dist/`, `public/mediapipe/` (~24 МБ артефактов MediaPipe), `*.local`.
- **NPM-имя в `package.json`** = `hand-tracking-demo` ↔ GitHub repo name = `hand-tracking-demo`. Совпадает, благодаря задаче 006.

## Verification
- `git remote -v` → `origin https://github.com/Noro97/hand-tracking-demo.git` (fetch + push). ✅
- `git branch -vv` → `* master a1a0d20 [origin/master]`. ✅
- `git log --oneline` → 2 коммита, оба запушены. ✅
- `gh repo view --json` → `visibility: PUBLIC`, `description` корректный, `defaultBranchRef.name: master`. ✅
- Открытие https://github.com/Noro97/hand-tracking-demo в браузере — должно показать README + содержимое.

## Retro
**Rating:** 5/5
**Comment:** Имплицитное согласие «yes» на финальный close-and-push. Явного рейтинг-числа не было.
**Lesson:** `gh repo create --source=. --remote=origin --push` одной командой — самый чистый способ создать remote и пушнуть. См. RETRO.md.
**Completed:** 2026-05-29
