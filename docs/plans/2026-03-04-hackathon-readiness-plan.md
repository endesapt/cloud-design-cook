# Plan Log: Hackathon Readiness

- Status: active
- Owner: ai-agent + team
- Last Verified: 2026-03-04

## Goal
Максимально повысить шанс прохождения в финал по критериям ТЗ МТС IaaS хакатона:
- идея и ценность;
- UX и пользовательские сценарии;
- креативность;
- корректность концепта (multitenancy/isolation/quota);
- визуализация;
- целостность проекта;
- качество презентации.

## Inputs Reviewed
1. Репозиторные инструкции: `AGENTS.md`, `docs/index.md` + профильные docs.
2. ТЗ хакатона: `docs/ТЗ Хакатон МТС.pdf` (прочитано 2026-03-04).
3. Текущее состояние кода/UI/API/tests + локальные проверки.

## Current Snapshot (as of 2026-03-04)
Плюсы:
1. Есть tenant/admin порталы, lifecycle ВМ, квоты, аудит, графики.
2. Серверные проверки tenant scope и quota реализованы.
3. Docker-backed эмуляция ВМ с fallback в mock реализована.
4. Введены `.nvmrc` и quickstart через `nvm use 24`.
5. Добавлен воспроизводимый запуск Postgres через `docker-compose.yml` и npm scripts.
6. Проведён desktop UI polish для tenant/admin core экранов (контраст, hierarchy, loading/empty states).

Критичные проблемы и риски:
1. Условие запуска тестов зависит от `nvm use 24`; без этого окружение может не видеть `node`.
2. Инвариант «cross-tenant foreign keys forbidden» остаётся преимущественно на API-уровне (DB hardening отложен по scope).
3. Mock lifecycle содержит случайность (`Math.random`) и нестабильный seed flow (`Date.now()` в seed/refs), что ухудшает повторяемость демо.
4. Mobile UX неполный: боковая навигация скрыта на мобильном (`md:block`), явного мобильного меню нет.

## Prioritized Backlog

### P0 — Must Fix Before Final Demo
1. **Local run reliability (Postgres + env bootstrap)**
- Добавить `docker-compose.yml` (или `docker compose` инструкцию) для Postgres.
- Добавить `.env.example` с безопасными дефолтами и примечаниями.
- Обновить `README.md`: пошаговый запуск БД + миграции + seed + app.
- Критерии: целостность/завершённость, UX для демонстраторов.

2. **Stabilize test/toolchain baseline**
- Зафиксировать поддерживаемую версию Node (рекомендуется >=20, через `.nvmrc` и README).
- Привести Vitest/Vite конфиг к рабочему состоянию.
- Довести обязательные проверки до зелёного статуса: lint/typecheck/test/test:e2e/docs:check.
- Критерии: целостность/готовность проекта.

3. **UI accessibility hotfix: button contrast + action readability**
- Провести аудит контраста ключевых CTA (primary/destructive/active nav).
- Исправить токены/варианты `Button` и states (`hover/disabled/focus`) под минимум WCAG AA.
- Проверить на desktop + mobile + projector-like условиях (низкая контрастность).
- Критерии: визуализация и UX.

4. **Harden tenant isolation at DB level**
- Усилить схему против cross-tenant связей (композитные ограничения/ссылки по tenant scope где применимо).
- Добавить интеграционные тесты, доказывающие запрет cross-tenant связей не только через API.
- Критерии: корректность концепта облачной платформы.

5. **Demo determinism mode**
- Ввести `DEMO_MODE_DETERMINISTIC=true`: фиксированная задержка provisioning, отключаемые случайные фейлы.
- Сделать seed идемпотентным (убрать `Date.now()` в именовании seed сущностей).
- Критерии: целостность и качество презентации (предсказуемый live-demo).

### P1 — Strongly Recommended (High Impact on Scoring)
1. **Критерий «Идея и ценность»**
- Добавить явный narrative: target audience, pain points, value proposition, почему этот подход.
- Оформить в отдельный doc (`docs/product-story.md`) + краткий elevator pitch в README.

2. **Критерий «UX и сценарии»**
- Описать и стабилизировать 2 сквозных сценария:
  - tenant: сеть -> SG -> VM -> action -> quota exceeded;
  - admin: обзор -> анализ -> изменение квоты -> возврат tenant flow.
- Добавить мобильную навигацию и улучшить empty/error/loading состояния в ключевых местах.

3. **Критерий «Визуализация и наглядность»**
- Добавить концептуальные схемы в `docs/` (изоляция tenant/network, поток provisioning, quota gate).
- Улучшить admin графики: подписи, легенды, акцентные KPI для pitch-экрана.

4. **API & audit completeness**
- Логировать операции, которые сейчас не попадают в audit (например, создание tenant, добавление SG rules).
- Добавить API contract tests на route handlers с тестовой БД.

5. **Admin completeness for TЗ language (“управлять клиентами”)**
- Добавить UI-сценарий создания tenant в админке (API уже есть).
- Показать управление клиентом end-to-end без ручных SQL/скриптов.

### P2 — Nice to Have (Differentiate on Creativity)
1. **Creative extensions**
- Шаблоны tenant-профилей (dev/test/prod) с автозаполнением квот.
- Быстрый «what-if» калькулятор ресурсов/емкости для admin.

2. **Presentation assets**
- Подготовить demo-runbook на 5–7 минут (тайминг, роли спикеров, fallback-план).
- Подготовить one-slide “architecture at a glance” + one-slide “risk & roadmap”.

## Suggested Execution Order (Minimal-Risk)
1. P0.1 + P0.2 (запуск и стабильность baseline).
2. P0.3 (контраст/читаемость интерфейса).
3. P0.4 + P0.5 (инварианты и детерминированность демо).
4. P1.2 + P1.5 (сценарии и admin completeness).
5. P1.1 + P1.3 + P2 (материалы для жюри и презентации).

## Definition of Done for "Final-Ready"
1. Новый разработчик поднимает проект за 10–15 минут по README (включая Postgres контейнер).
2. Все обязательные проверки зелёные локально и в CI.
3. Контраст и читабельность ключевых action-кнопок подтверждены на demo-экране.
4. Tenant isolation подтверждена API + DB guardrails + тестами.
5. Демо проходит стабильно 3 раза подряд без случайных фейлов.
6. Есть готовый demo-script и визуальные схемы для защиты.

## Residual Risks
1. Если не закрыть toolchain/Node baseline, автоматические тесты останутся нефункциональны.
2. Если оставить случайность provisioning, риск live-demo сбоя останется.
3. Без DB-level усиления остаётся архитектурный риск обхода инвариантов вне API слоя.

## Execution Update (2026-03-04)
1. Исправлен сценарий `npm run dev` с немым завершением: подтверждён запуск после переустановки `node_modules` под Node `24.14.0`.
2. Исправлена ошибка валидации при создании инстанса: идентификаторы ресурсов в API принимают UUID-совместимый формат seed-данных.
3. Исправлена подсветка sidebar: для вложенных маршрутов активным становится только наиболее специфичный пункт (например `/instances/new`).
4. Убран лишний `demo`-текст из ключевых UI-экранов и seed-операций, чтобы интерфейс выглядел более продуктово.
5. Улучшена идемпотентность seed: базовые SG/rules/instance/log теперь стабильно переиспользуются, без наращивания шумных seed-данных.
6. Добавлен client-side fallback для устаревшей сессии после пересоздания БД: при `UNAUTHORIZED` пользователь перенаправляется на `/login`.
7. Нормализовано поведение tenant API для устаревшей сессии: `/api/v1/quota` и `/api/v1/activity` возвращают `UNAUTHORIZED`, API-ответ сбрасывает `iaas_session`, чтобы фронт не застревал в цикле ошибок.
8. Добавлен alias endpoint `/api/v1/logs` (legacy `/api/v1/activity` сохранён) и dashboard переведён на `/api/v1/logs` для обхода `ERR_BLOCKED_BY_CLIENT` от browser extensions.
