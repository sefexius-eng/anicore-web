# Аудит проекта AniCore / AniMirok

Дата аудита: 2026-04-24
Репозиторий: `https://github.com/sefexius-eng/anicore-web.git`
Текущая ветка: `main`

## Зачем этот файл
Этот документ нужен как handoff для другой нейросети или нового разработчика. Он описывает, что уже реализовано в проекте, какие части реально используются, как идут данные по приложению, где лежит важная логика, какие есть риски, и что выглядит как старый/резервный код.

## Коротко о проекте
AniCore, которое в интерфейсе называется `AniMirok`, это Next.js-приложение для просмотра аниме.

Фактически проект состоит из 5 больших блоков:
- UI на Next.js App Router.
- Аутентификация через NextAuth credentials.
- Пользовательские данные в PostgreSQL через Prisma.
- Каталог/поиск/метаданные аниме через Jikan и Shikimori.
- Видео-плеер через Kodik iframe и серверный резолвер ссылки.

Главная особенность архитектуры: проект не использует один единый источник данных.

Сейчас источники разделены так:
- Jikan используется в серверных страницах для главной, профиля, метаданных и рекомендаций.
- Shikimori используется в браузере для поиска, деталей аниме и франшиз.
- Kodik используется для получения playable-ссылки на плеер.
- Prisma/PostgreSQL используются для аккаунтов, watchlist и серверной истории просмотра.
- `localStorage` используется для клиентской истории просмотра.

## Текущее состояние репозитория
На момент завершения аудита рабочее дерево чистое, кроме самого файла:
- `PROJECT_AUDIT.md`

Последние коммиты тоже показывают, что слой видео недавно несколько раз переделывался:
- `0209937` refactor: migrate video data fetching to client-side CORS gateway and remove broken server route
- `61426a6` perf: migrate video api route to edge runtime for better latency and network routing
- `7e78a1e` refactor: keep video provider requests internal and add server fallback search
- `2150dde` refactor: move player fetch to secure internal api and fix loading text encoding
- `435ca8d` fix: route kodik api through codetabs proxy to bypass vercel geo-block, fix image fallback logic

Вывод: видео-слой исторически был самой нестабильной и часто меняющейся частью проекта.

## Проверка здоровья проекта
На момент аудита:
- `npm run lint` проходит без ошибок.
- `npm run build` проходит без ошибок.
- Автотестов в репозитории не найдено.

Итог сборки:
- динамические страницы: `/`, `/anime/[id]`, `/history`, `/login`, `/profile`, `/search`, все API routes
- статические страницы: `/_not-found`, `/register`

## Стек
Основной стек:
- `next@16.2.4`
- `react@19.2.4`
- `typescript@5`
- `prisma@6`
- `next-auth@4`
- `tailwindcss@4`
- `@base-ui/react`
- `lucide-react`

Внешние интеграции:
- Jikan API
- Shikimori API
- Kodik API
- `@consumet/extensions` / Gogoanime parser

Важно: не все зависимости из `package.json` выглядят активными в текущем боевом потоке. Часть выглядит как наследие прошлых итераций. Ниже это отмечено отдельно.

## Структура проекта
Основные папки:
- `app/` — App Router страницы и API routes.
- `components/shared/` — доменные UI-компоненты проекта.
- `components/ui/` — примитивы UI на базе `@base-ui/react` и shadcn-стиля.
- `lib/` — auth, prisma, watchlist, local history, helpers.
- `services/` — клиентские сервисы внешних аниме API.
- `prisma/` — актуальная Prisma schema.
- `types/` — типы аниме и расширения NextAuth.

Важные файлы верхнего уровня:
- `package.json` — скрипты и зависимости.
- `next.config.ts` — `serverExternalPackages` и полностью открытые `remotePatterns`.
- `app/globals.css` — тема Tailwind 4 + shadcn-переменные.
- `README.md` — устаревший, всё ещё от `create-next-app`, не описывает реальный проект.

## Что реально используется в рантайме
### Маршруты страниц
`app/layout.tsx`
- общий root layout
- подключает `Geist`, `NextTopLoader`
- принудительно ставит `dark` на `<html>`
- содержит debug `console.log` через `<Script id="deploy-debug-marker">`

`app/(site)/layout.tsx`
- оборачивает основной сайт
- рендерит `NavbarShell`, `Footer`
- задаёт общий контейнер и декоративные фоновые градиенты

`app/(site)/page.tsx`
- главная страница
- серверная
- если пользователь авторизован, берёт последний просмотр из Prisma `watchHistory` и строит рекомендации через Jikan по жанрам
- блок популярного берётся из `https://api.jikan.moe/v4/seasons/now?sfw=true`
- использует `dynamic = "force-dynamic"`

`app/(site)/search/page.tsx`
- клиентская страница поиска
- ищет через динамический импорт `searchAnime` из `services/jikanApi.ts`
- фактически идёт не в Jikan, а в Shikimori из браузера

`app/(site)/history/page.tsx`
- рендерит `HistoryContent`
- история здесь берётся из `localStorage`, а не напрямую из Prisma

`app/(site)/profile/page.tsx`
- серверная защищённая страница
- если нет сессии, редирект на `/login`
- грузит пользователя, серверную историю и watchlist из Prisma
- затем обогащает их карточками аниме через Jikan
- показывает avatar upload, метрики, недавнюю историю, секции watchlist

`app/(site)/anime/[id]/page.tsx`
- серверная страница деталей/просмотра аниме
- `generateMetadata()` берёт данные из Jikan
- сама UI-часть отдаётся в клиентский `AnimePageClient`

`app/login/page.tsx` + `app/login/login-form.tsx`
- логин через `next-auth/react` и credentials provider

`app/register/page.tsx`
- регистрация через `POST /api/auth/register`
- после успешной регистрации сразу делает `signIn("credentials")`

### API routes
`app/api/auth/[...nextauth]/route.ts`
- стандартный NextAuth handler

`app/api/auth/register/route.ts`
- регистрация пользователя
- валидирует `email`, `name`, `password`, `birthDate`
- хэширует пароль через `bcryptjs`
- создаёт пользователя в Prisma
- ловит `P2002` как duplicate email
- содержит debug `console.log("Register attempt for:", body.email)`

`app/api/watchlist/route.ts`
- CRUD для watchlist
- требует авторизацию
- использует `upsert`
- после записи делает `revalidatePath("/profile")`

`app/api/history/route.ts`
- пишет и удаляет серверную историю просмотра
- требует авторизацию
- `POST` обновляет только `lastTime`, поле `episodesWatched` всегда остаётся `0`
- `DELETE` умеет удалять один тайтл или всю историю
- делает `revalidatePath("/")` и `revalidatePath("/profile")`

`app/api/user/me/route.ts`
- отдаёт текущий avatar `image`

`app/api/user/avatar/route.ts`
- принимает `data:image/...` или обычный `http/https` URL
- сохраняет прямо в поле `user.image`
- есть лимит длины строки `2_000_000`

`app/api/kodik/route.ts`
- главный server-side резолвер плеера
- принимает `mal_id`, `season`, `title`
- сначала пробует искать через `shikimori_id`, потом по `title`
- возвращает `link` на playable Kodik iframe
- содержит расширенную обработку ошибок/таймаутов/DNS
- использует `runtime = "nodejs"`
- если `KODIK_TOKEN` не задан, берёт fallback из константы `DEFAULT_KODIK_TOKEN`

`app/api/search/route.ts`
- legacy-маршрут
- всегда возвращает `410` с текстом `Search now runs in the browser.`
- нужен только как явный маркер, что серверный поиск больше не используется

`app/api/stream/route.ts`
- legacy/резервный серверный поток через `@consumet/extensions`
- использует Gogoanime parser и Jikan для маппинга `malId -> title -> episode -> source`
- при ошибке отдаёт `TEST_STREAM_URL`
- по коду активных импортов не используется текущим UI

## Данные и хранение состояния
### Prisma schema
Актуальная схема лежит в `prisma/schema.prisma`.

Модели:
- `User`
- `WatchHistory`
- `Watchlist`

`User`
- `id Int @id @default(autoincrement())`
- `email String @unique`
- `name String`
- `image String?`
- `password String`
- `birthDate DateTime`
- `createdAt`, `updatedAt`

`WatchHistory`
- составной ключ `[userId, animeId]`
- хранит `lastTime`
- хранит `episodesWatched`, но сейчас это поле не используется по-настоящему

`Watchlist`
- `id cuid()`
- `userId + animeId` unique
- `status` строкой

### Где реально хранится пользовательское состояние
Состояние пользователя разделено на два слоя:

Серверное состояние:
- аккаунт
- дата рождения
- avatar URL/data URL
- watchlist
- серверная история просмотра (`lastTime`)

Локальное состояние браузера:
- история просмотра в `localStorage`
- ключ: `anicore_history`
- custom event: `anicore:watch-history-updated`
- лимит: 50 записей

### Важный нюанс по истории просмотра
История реализована гибридно.

Как это работает:
- `InteractivePlayer` слушает `window.postMessage`
- ждёт событие с ключом `kodik_player_time_update`
- обновляет `localStorage`
- периодически отправляет `POST /api/history` для синхронизации на сервер

Это значит:
- страница `/history` показывает локальную историю браузера
- профиль показывает историю из Prisma
- эти две истории могут расходиться, если пользователь не авторизован, очистил localStorage или синхронизация не сработала

## Auth и доступ
Аутентификация собрана в `lib/auth.ts`.

Что настроено:
- `NextAuth` с `strategy: "jwt"`
- только `CredentialsProvider`
- логин по `email/password`
- password compare через `bcryptjs.compare`
- страница логина: `/login`
- страница регистрации: `/register`

Сессионные детали:
- в JWT кладутся `id`, `name`, `email`
- в `session` дополнительно подмешивается `birthDate` из Prisma
- `session.user.image` принудительно сбрасывается в `null`

Есть вспомогательный `getViewerAccess()`:
- возвращает `hasSession`
- возвращает `hasAdultAccess`
- возвращает `shouldFilterAdultContent`

Но на момент аудита `getViewerAccess()` нигде не используется в боевом UI.

Вывод:
- дата рождения реально собирается и хранится
- базовая age-логика есть
- полноценное глобальное ограничение adult-контента пока не доведено до конца

## Внешние источники данных
### Jikan
Используется в серверной части:
- главная страница
- рекомендации
- профиль
- `generateMetadata()` для `/anime/[id]`

Jikan даёт:
- title
- synopsis
- images
- score
- genres
- seasonal/popular lists

### Shikimori
Используется через `services/jikanApi.ts`.

Это очень важный момент:
- файл называется `jikanApi.ts`
- по факту он работает с `https://shikimori.one/api`

Через него идут:
- `searchAnime()`
- `getAnimeById()`
- `getAnimeDetailsById()`
- `getAnimeFranchiseSeasons()`

То есть название сервиса вводит в заблуждение. Для следующей нейросети это одна из самых важных деталей проекта.

### Kodik
Используется как источник playable iframe-ссылки.

Поток такой:
- клиент вызывает `/api/kodik?mal_id=...&title=...`
- route на сервере ищет запись в Kodik
- клиент получает `link`
- `InteractivePlayer` вставляет этот `link` в `<iframe>`

### Consumet / Gogoanime
Используются только в `app/api/stream/route.ts`.

На момент аудита активный UI не импортирует этот route. Это выглядит как старый альтернативный поток стриминга, оставленный про запас.

## Главные пользовательские сценарии
### 1. Регистрация
Цепочка:
- пользователь открывает `/register`
- форма отправляет `POST /api/auth/register`
- сервер валидирует поля и пишет пользователя в Prisma
- после успеха клиент сразу делает `signIn("credentials")`
- затем редирект на `/`

### 2. Логин
Цепочка:
- пользователь открывает `/login`
- `login-form.tsx` вызывает `signIn("credentials", { redirect: false })`
- при успехе делает `router.push(result.url || callbackUrl)`

### 3. Поиск
Цепочка:
- поиск есть в navbar и на отдельной странице `/search`
- обе точки делают динамический импорт `searchAnime` из `services/jikanApi.ts`
- фактически поиск идёт в Shikimori прямо из браузера
- результаты ведут на `/anime/[id]`

### 4. Страница аниме
Цепочка:
- `app/(site)/anime/[id]/page.tsx` валидирует `id`
- metadata приходит с Jikan на сервере
- `AnimePageClient` в браузере догружает детали из Shikimori
- `AnimeWatchShell` догружает seasons франшизы из Shikimori
- `WatchArea` показывает сезонные ссылки и watchlist dropdown
- `InteractivePlayer` получает Kodik iframe-ссылку через `/api/kodik`

### 5. История просмотра
Цепочка:
- Kodik iframe отправляет `postMessage`
- `InteractivePlayer` ловит `kodik_player_time_update`
- запись идёт в `localStorage`
- периодически идёт `POST /api/history`
- страница `/history` читает `localStorage`
- профиль читает Prisma

### 6. Watchlist
Цепочка:
- `WatchlistDropdown` при монтировании вызывает `GET /api/watchlist?animeId=...`
- если 401, при клике отправляет пользователя на `/login?callbackUrl=/anime/[id]`
- если авторизован, позволяет `POST` или `DELETE`
- профиль читает watchlist напрямую из Prisma

### 7. Профиль и аватар
Цепочка:
- профиль требует авторизацию
- сервер тянет user/history/watchlist
- `AvatarUpload` умеет сохранять avatar как data URL
- `UserAvatar` отдельно запрашивает `/api/user/me`
- для обновления используется custom event `anicore:user-avatar-updated`

## Ключевые компоненты
`components/shared/navbar.tsx`
- серверный navbar
- сам проверяет сессию через `auth()`

`components/shared/navbar-search.tsx`
- один из самых активных клиентских компонентов
- debounce-поиск
- dropdown результатов
- keyboard navigation
- голосовой поиск через `SpeechRecognition/webkitSpeechRecognition`

`components/shared/anime-card.tsx`
- универсальная карточка аниме
- имеет fallback-логику для изображений `shikimori.one -> desu.shikimori.one -> shikimori.me -> placeholder`

`components/shared/anime-page-client.tsx`
- клиентская orchestration-обвязка страницы аниме
- связывает детали, synopsis и просмотр

`components/shared/anime-watch-shell.tsx`
- строит и фильтрует season links внутри франшизы
- использует heuristics по префиксу названия

`components/shared/WatchArea.tsx`
- верхний блок “смотреть онлайн”
- watchlist + сезонные ссылки + player

`components/shared/InteractivePlayer.tsx`
- центральная точка player-flow
- получает iframe URL из `/api/kodik`
- хранит ошибку/загрузку
- синхронизирует историю локально и на сервер

`components/shared/history-content.tsx`
- история просмотра из `localStorage`
- умеет удалять отдельные записи и очищать всё
- при удалении пытается синхронизировать удаление с сервером через `/api/history`

`components/shared/avatar-upload.tsx`
- загрузка изображения в `data:image/...`
- прямое сохранение строки в БД

## Активный код vs хвосты/наследие
### Активный и важный код
Используется текущим пользовательским потоком:
- `app/(site)/page.tsx`
- `app/(site)/search/page.tsx`
- `app/(site)/history/page.tsx`
- `app/(site)/profile/page.tsx`
- `app/(site)/anime/[id]/page.tsx`
- `components/shared/navbar-search.tsx`
- `components/shared/anime-page-client.tsx`
- `components/shared/anime-watch-shell.tsx`
- `components/shared/WatchArea.tsx`
- `components/shared/InteractivePlayer.tsx`
- `components/shared/watchlist-dropdown.tsx`
- `lib/auth.ts`
- `lib/prisma.ts`
- `lib/watch-history.ts`
- `services/jikanApi.ts`
- `app/api/kodik/route.ts`
- `app/api/watchlist/route.ts`
- `app/api/history/route.ts`

### Похоже на legacy/unused code
По активным импортам на момент аудита не видно использования:
- `components/shared/home-popular-content.tsx`
- `components/shared/translation-sidebar.tsx`
- `components/shared/VideoPlayer.tsx`
- `components/shared/watch-history-tracker.tsx`
- `components/ui/carousel.tsx`
- `services/anime.service.ts`
- `app/api/stream/route.ts`

Отдельно:
- `lib/generated/prisma/` существует на диске, но в активном коде импортов на него нет
- внутри него виден старый сгенерированный Prisma-клиент со старой SQLite-схемой
- текущий проект использует не его, а `@prisma/client` через `lib/prisma.ts`

Вывод:
- эти файлы надо считать либо архивом, либо незавершёнными остатками прошлых подходов
- при новом рефакторинге их легко перепутать с реальным runtime-кодом

## Переменные окружения
В `.env` на момент аудита присутствуют имена:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_POSTGRES_PRISMA_URL`
- `DATABASE_POSTGRES_URL_NON_POOLING`

Что реально важно:
- `prisma/schema.prisma` использует `DATABASE_POSTGRES_PRISMA_URL`
- `prisma/schema.prisma` использует `DATABASE_POSTGRES_URL_NON_POOLING`
- `lib/auth.ts` использует `NEXTAUTH_SECRET`

Замечания:
- `DATABASE_URL` в текущей Prisma schema не используется, выглядит как legacy-переменная
- `KODIK_TOKEN` и `NEXT_PUBLIC_KODIK_TOKEN` читаются в `app/api/kodik/route.ts`, но среди имён в `.env` их нет
- значит, либо токен задаётся вне `.env`, либо сейчас реально используется fallback `DEFAULT_KODIK_TOKEN`

## Заметные архитектурные проблемы и риски
### 1. Смешение источников данных
Проект одновременно использует Jikan, Shikimori и Kodik.

Это даёт плюсы по покрытию, но создаёт проблемы:
- разные ID и разные поля
- разные форматы title
- логика маппинга расползается по коду
- сложно гарантировать единое поведение по adult filtering и quality fallback

### 2. Неочевидное имя сервиса `services/jikanApi.ts`
Это один из самых опасных источников путаницы:
- по имени кажется, что это Jikan
- по факту это Shikimori browser client

Новая нейросеть почти наверняка споткнётся об это без явного предупреждения.

### 3. Разделённая история просмотра
История раздвоена:
- локальная история для `/history`
- серверная история для `/profile` и рекомендаций

Из-за этого возможны расхождения между страницами.

### 4. Age-gating реализован частично
Есть:
- `birthDate`
- `isAdult()`
- `getViewerAccess()`
- фильтрация restricted genres в `services/jikanApi.ts`

Но нет:
- явного единого enforcement-слоя во всём приложении
- заметного использования `getViewerAccess()` в маршрутах

### 5. Hardcoded fallback token для Kodik
В `app/api/kodik/route.ts` есть `DEFAULT_KODIK_TOKEN`.

Это риск:
- секретоподобные данные зашиты в код
- если env не задан, система может незаметно жить на fallback
- такой токен сложно безопасно ротировать

### 6. Avatar хранится прямо строкой в БД
Сейчас avatar может быть:
- внешним URL
- большим `data:image/...`

Это упрощает реализацию, но даёт минусы:
- потенциально раздувает БД
- нет отдельного file storage
- возможны длинные строки и дублирование

### 7. Полностью открытые remote images
В `next.config.ts` разрешены любые `http` и `https` remote images через wildcard.

Это удобно, но слишком широко для production-конфига.

### 8. Старый Prisma generated code лежит рядом с актуальным кодом
`lib/generated/prisma` содержит старую SQLite-модель и не используется.

Это риск для:
- людей
- AI-ассистентов
- будущих миграций

### 9. README не отражает реальность
`README.md` всё ещё стандартный от Next.js и не объясняет:
- как устроены API
- какие env нужны
- как работает player
- какие внешние сервисы обязательны

### 10. В проекте остались отладочные следы
Примеры:
- debug `console.log` в `app/layout.tsx`
- debug `console.log` в регистрации
- логи/артефакты dev server в корне проекта

Это не ломает приложение, но показывает, что проект ещё в активной фазе настройки.

## Что в проекте, скорее всего, нужно читать в первую очередь
Если новую нейросеть надо быстро ввести в контекст, пусть читает файлы в таком порядке:

1. `package.json`
2. `prisma/schema.prisma`
3. `lib/auth.ts`
4. `lib/prisma.ts`
5. `app/(site)/page.tsx`
6. `app/(site)/anime/[id]/page.tsx`
7. `components/shared/anime-page-client.tsx`
8. `components/shared/anime-watch-shell.tsx`
9. `components/shared/WatchArea.tsx`
10. `components/shared/InteractivePlayer.tsx`
11. `app/api/kodik/route.ts`
12. `services/jikanApi.ts`
13. `app/api/watchlist/route.ts`
14. `app/api/history/route.ts`
15. `app/(site)/profile/page.tsx`
16. `components/shared/navbar-search.tsx`

После этого уже смотреть legacy/unused:
- `app/api/stream/route.ts`
- `components/shared/VideoPlayer.tsx`
- `components/shared/translation-sidebar.tsx`
- `lib/generated/prisma/`

## Краткая выжимка для другой нейросети
Если нужно очень коротко объяснить проект другой модели, можно дать ей этот текст:

`Это Next.js 16 / React 19 аниме-сайт AniMirok. Авторизация через NextAuth credentials, данные пользователя в PostgreSQL через Prisma. Главная и профиль используют Jikan на сервере, а поиск/детали/франшизы используют Shikimori в браузере через services/jikanApi.ts, который по имени misleading. Плеер работает через Kodik: InteractivePlayer вызывает /api/kodik, получает iframe link и слушает postMessage kodik_player_time_update для сохранения истории. История гибридная: localStorage для /history и Prisma для /profile/recommendations. Watchlist хранится в Prisma. Есть legacy-код: app/api/stream/route.ts, VideoPlayer.tsx, translation-sidebar.tsx, home-popular-content.tsx, services/anime.service.ts, lib/generated/prisma. Видео-слой в истории репозитория менялся чаще остальных частей, поэтому его стоит читать особенно внимательно.`

## Практический вывод
Проект уже не сырой: логин, регистрация, профиль, watchlist, поиск, просмотр и история работают как цельная система, а сборка и линт зелёные.

Но при этом проект всё ещё находится в переходном состоянии:
- video-flow недавно несколько раз переделывался
- есть смешение Jikan/Shikimori/Kodik
- есть legacy-код, который легко принять за актуальный
- часть инфраструктуры взрослая, а часть ещё экспериментальная

Если следующая нейросеть будет что-то менять, safest path такой:
- сначала работать только с активным runtime-путём
- legacy-файлы не трогать без прямой необходимости
- любые правки player/kodik делать особенно осторожно
- не путать `services/jikanApi.ts` с реальным Jikan 
 
аудит от гпт-5.5 про: Провел аудит проекта. Код не менял. Поднял dev-сервер, он сейчас доступен на [http://localhost:3000](http://localhost:3000). В git появились только мои временные логи проверки `dev.audit.out.log` и `dev.audit.err.log`.

**Главное**
Проект уже довольно живой: Next.js 16, React 19, Prisma/Postgres, NextAuth, поиск, профиль, watchlist, история, отзывы, комментарии, подписки и лента. Но есть несколько вещей, которые стоит чинить первыми.

1. `npm run lint` сейчас падает:
[app/(site)/search/page.tsx](</C:/Users/sefex/Desktop/САЙТ AniCore/anicore/app/(site)/search/page.tsx:105>) синхронно вызывает `setState` внутри `useEffect`.

2. В браузере есть hydration mismatch:
[navbar-search.tsx](</C:/Users/sefex/Desktop/САЙТ AniCore/anicore/components/shared/navbar-search.tsx:96>) проверяет `window.SpeechRecognition` прямо во время рендера. На сервере кнопки микрофона нет, на клиенте она появляется, React ругается. Лучше хранить поддержку микрофона в state и выставлять ее после mount.

3. Мобильный/узкий layout ломается визуально:
[sidebar.tsx](</C:/Users/sefex/Desktop/САЙТ AniCore/anicore/components/shared/sidebar.tsx:54>) всегда занимает `w-64`, поэтому основной контент сжимается в узкую колонку. Нужен mobile bottom-nav или `Sheet`-меню, а sidebar показывать только с `lg`.

4. В коде захардкожен Kodik token:
[app/api/kodik/route.ts](</C:/Users/sefex/Desktop/САЙТ AniCore/anicore/app/api/kodik/route.ts:224>). Лучше убрать fallback-токен из кода и требовать `KODIK_TOKEN` из env.

5. `next.config.ts` разрешает любые remote images по `http` и `https`:
[next.config.ts](</C:/Users/sefex/Desktop/САЙТ AniCore/anicore/next.config.ts:5>). Для production лучше ограничить доменами Jikan/Shikimori/Kodik/placeholders.

6. `README.md` все еще шаблонный. Проект уже сложный, ему нужен нормальный README: env, API, Prisma, запуск, внешние сервисы, как работает player.

7. Нет автотестов. Хотя бы smoke-тесты для `search`, `kodik`, `watchlist`, `history`, `comments/reviews` сильно снизят риск.

8. `npm audit --omit=dev` показывает 4 moderate-уязвимости через `next-auth/uuid` и `next/postcss`. `npm audit fix` вслепую запускать не стоит, он предлагает странные major/downgrade-решения. Лучше обновлять вручную и проверять совместимость.

**UX И Интерфейс**
Самое заметное улучшение: адаптив. На узком экране сейчас видно только часть логотипа/поиска, sidebar съедает пространство, карточки становятся слишком мелкими. Я бы первым делом сделал: мобильный верхний header, нижнюю навигацию или бургер, а поиск открыл бы отдельной полноэкранной панелью.

На странице аниме хорошая база: плеер сверху, выбор озвучки, сезоны, описание, отзывы. Но гостям сразу показываются формы комментариев/рецензий, которые потом упираются в 401. Лучше показывать понятный CTA “Войдите, чтобы оставить комментарий/оценку”.

В профиле уже есть классная заготовка с достижениями, но достижений фактически мало. Это прям просится в геймификацию: серии подряд, любимый жанр, первый отзыв, 10 комментариев, завершенный сезон, “ночной зритель”.

**Что Добавить Интересного**
- “Продолжить просмотр” на главной первым блоком.
- Календарь выхода серий и “сегодня выходит”.
- Умные подборки: по жанрам из истории, по оценкам друзей, “похоже на последнее просмотренное”.
- Нормальные коллекции: “Хочу пересмотреть”, “Лучшие романтики”, “Смотреть с друзьями”.
- Страница франшизы: порядок сезонов, фильмы, OVA, спин-оффы.
- Уведомления о новых сериях и активности друзей.
- Watch-party/комнаты обсуждений для тайтла.
- Более глубокий социальный слой: лайки на рецензии, комментарии к активности, публичные списки.

**Проверки**
`next build` проходит. `npx tsc --noEmit` проходит. `npm run lint` не проходит. В браузере страница грузится, но React/Next показывает hydration issue. Следующий самый полезный шаг: починить `navbar-search` hydration, затем lint в search page, затем мобильный layout.
