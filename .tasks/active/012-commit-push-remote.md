# 012 — Follow-up commit + создание GitHub remote + push

**Status:** active
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
- [ ] `git add .` — добавить все 15 modified + 7 untracked файлов.
- [ ] `git status --short` — sanity-check stage (никаких `node_modules`, `dist`, `public/mediapipe`).
- [ ] `git commit -m` с HEREDOC-сообщением, перечисляющим задачи 008–011.
- [ ] `gh repo create Noro97/hand-tracking-demo --public --source=. --remote=origin --description="..."` — создание remote'а сразу с привязкой к локальному репо.
- [ ] `git push -u origin <branch>` — первичный push (или `gh repo create` сам пушит, проверить флаги).
- [ ] `gh repo view --web` или `git remote -v` — подтвердить наличие remote'а.
- [ ] `git log --oneline` — два коммита в истории.

## Notes
_(заполняется по ходу выполнения)_

## Verification
_(заполняется на шаге 5)_
