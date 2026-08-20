# DevRoom Backend (Node.js / Express)

Node.js + Express port of the original Spring Boot `DevRoom` backend
(`C:\Users\senan\OneDrive\Desktop\DevRoom`). Same REST API, same STOMP/SockJS
realtime contract, same Postgres (Supabase) database — different runtime.

## Stack

- **Express** - HTTP server / routing
- **Mongoose** - ODM over MongoDB (Atlas), equivalent of Spring Data JPA / Hibernate
- **sockjs** + a small hand-rolled STOMP 1.2 frame layer (`src/ws/stomp`) - equivalent of Spring's `@EnableWebSocketMessageBroker` + SockJS fallback, compatible with `@stomp/stompjs` + `sockjs-client` on the frontend
- **zod** - request validation, equivalent of `jakarta.validation` annotations
- **swagger-jsdoc** + **swagger-ui-express** - equivalent of springdoc-openapi

## Project layout

```
src/
  config/      env, CORS, Sequelize connection
  enums/       Language, Role, RoomStatus
  models/      Sequelize models (Room, Participant, ExecutionLog) + associations
  errors/      typed exceptions (AppError subclasses)
  dto/         response envelope (ApiResponse)
  mappers/     entity -> response DTO mapping
  repositories/ data-access layer (Spring Data JPA equivalent)
  services/    business logic (Room/Participant/Execution/CodeRunner)
  validators/  zod request schemas
  middleware/  validate, errorHandler, notFound
  controllers/ route handlers
  routes/      one Express router per resource, mounted in routes/index.js
  ws/          STOMP-over-SockJS broker, message handlers, event listener
  app.js       Express app wiring
  server.js    entrypoint (DB connect -> HTTP server -> WebSocket attach -> listen)
```

## Setup

```bash
cd codespaceback
npm install
npm run dev   # nodemon, or: npm start
```

Configuration lives in `.env` (see `.env.example` for the template). **You
must paste your own MongoDB Atlas connection string into `MONGODB_URI`**
before the server can boot (Atlas dashboard -> Connect -> Drivers).

| Var | Meaning |
|---|---|
| `PORT` | HTTP port (default `8080`, same as the Java app) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `MONGODB_URI` | Full Atlas connection string, including a database name in the path |
| `DB_LOGGING` | `true` = log every Mongoose query |
| `WS_PATH` | SockJS endpoint path (default `/ws-devroom`, matches the Java app) |
| `EXEC_*` | Limits around the `/executions/run` endpoint's call to Wandbox (see below) |
| `JWT_SECRET` | Signs teacher auth tokens - **required**, the app refuses to boot without it (see `src/utils/jwt.js`) |
| `JWT_EXPIRES_IN` | Teacher token lifetime (default `7d`) |
| `TRIAL_DAYS` | Free room-creation trial length for a newly registered teacher (default `7`) |
| `ADMIN_KEY` | Shared secret for the internal `/billing/admin/...` and `/rooms/cleanup` endpoints (`x-admin-key` header). Unset = those endpoints are locked entirely |
| `BILLING_CURRENCY`, `BILLING_PRICE_MINOR`, `BILLING_PERIOD_DAYS` | Placeholder pricing shown by `GET /billing/plan` - no payment gateway is wired up yet, see below |

### Data model notes (MongoDB vs. the original Postgres/JPA schema)

- `Room` / `Participant` / `ExecutionLog` are now Mongoose documents in
  collections `rooms`, `participants`, `execution_logs`.
- Relations (`Participant.room`, `ExecutionLog.participant`, `ExecutionLog.room`)
  are `ObjectId` references (`ref: '...'`), resolved with `.populate()` where
  needed — there's no SQL JOIN, so repository functions that filtered "by
  room code" now look the room up first, then query by its `_id`.
- **IDs are MongoDB ObjectId strings (24 hex chars), not auto-increment
  numbers.** `participantId` in the REST body, the `:participantId` route
  param, and the `participantId` field in every WebSocket JSON payload are
  now strings, e.g. `"participantId":"66aa1234bcde5678f9012345"` instead of
  `"participantId":5`. If a frontend is written against this backend, treat
  `participantId` as an opaque string, not a number.

**No Docker needed.** `POST /api/v1/executions/run` used to shell out to a
local `docker` CLI (`src/services/docker.service.js`, mirroring the original
`DockerService.java`), which only works where a Docker daemon is reachable -
fine on a dev machine with Docker Desktop, not on Render/Vercel, whose
containers don't expose one. `src/services/codeRunner.service.js` replaces it
with calls to [Wandbox](https://wandbox.org/api) (`https://wandbox.org/api/compile.json`),
a free, keyless, publicly hosted compile-and-run API - no infra of our own to
run or pay for. (Piston's public API, the more obvious fit, went
whitelist-only in Feb 2026 and excludes individual/non-commercial projects,
so it wasn't an option.) `EXEC_TIMEOUT_SECONDS`, `EXEC_MAX_CONCURRENT_CONTAINERS`,
and `EXEC_QUEUE_WAIT_SECONDS` still apply, now bounding the Wandbox request
instead of a container; `EXEC_MEMORY_LIMIT_MB` is unused (Wandbox sandboxes
its own memory limits) but left in `.env` in case a self-hosted runner
replaces this later.

## REST API

- `POST   /api/v1/auth/register` — `{ name, email, password }`, starts the teacher's free trial
- `POST   /api/v1/auth/login` — `{ email, password }`
- `GET    /api/v1/auth/me` — 🔒 current teacher's profile + trial/subscription status
- `GET    /api/v1/billing/plan` — current placeholder pricing (payments not active yet)
- `GET    /api/v1/billing/status` — 🔒 trial/subscription status
- `POST   /api/v1/billing/subscribe` — 🔒 always `503`, no payment gateway wired up yet
- `POST   /api/v1/billing/admin/teachers/:teacherId/grant` — 🔑 admin-only, manually activates a subscription
- `POST   /api/v1/rooms` — 🔒 create a room `{ language: "PYTHON" | "JAVA" }` (requires an active trial/subscription)
- `GET    /api/v1/rooms/mine` — 🔒 rooms owned by the current teacher
- `GET    /api/v1/rooms/:roomCode`
- `DELETE /api/v1/rooms/:roomCode` — 🔒 deactivate, owning teacher only
- `PATCH  /api/v1/rooms/cleanup` — 🔑 admin-only, deactivate empty active rooms
- `GET    /api/v1/rooms/languages`
- `POST   /api/v1/participants/join` — `{ roomCode, nickname }`, no account needed (students never log in)
- `GET    /api/v1/participants/room/:roomCode`
- `POST   /api/v1/executions/run` — `{ participantId, roomCode, code }`
- `GET    /api/v1/executions/history/room/:roomCode`
- `GET    /api/v1/executions/history/participant/:participantId?roomCode=...`

🔒 = requires `Authorization: Bearer <token>` from `/auth/login` or `/auth/register`.
🔑 = requires the `x-admin-key` header (see `ADMIN_KEY` above).

Swagger UI: `http://localhost:8080/swagger-ui.html`

## WebSocket (STOMP over SockJS)

Connect with `sockjs-client` + `@stomp/stompjs` to `ws://localhost:8080/ws-devroom`,
exactly as you would against the Spring endpoint. Broker prefix `/topic`,
application prefix `/app`.

- On `POST /api/v1/participants/join`, `participant.service.js` broadcasts
  `{participantId, nickname, role, joined:true, online:false}` on
  `/topic/room/{roomCode}/participants` (extends the original Java contract)
  so a teacher dashboard that's already open picks up the new student
  immediately, instead of waiting for their first code keystroke.
- `SEND /app/stream/{roomCode}/{participantId}` — student streams code (raw text body)
- `SEND /app/watch/{roomCode}/{participantId}` — teacher requests current code
- `SEND /app/edit-lock/{roomCode}/{participantId}` — teacher opens/cancels edit mode (raw body `"true"`/`"false"`;
  not part of the original Java contract) — broadcasts `{participantId, locked}` on the `/edit` topic below so the
  student's editor locks the instant the teacher starts editing, before anything is actually saved
- `SEND /app/edit-stream/{roomCode}/{participantId}` — teacher's in-progress keystrokes while editing, before
  Save (raw text body = current draft; not part of the original Java contract, not persisted to the DB) —
  broadcasts `{participantId, liveCode}` on the `/edit` topic below so the student can watch the edit happen
  live, the same way `/app/stream` lets the teacher watch the student type. Frontend should send this
  debounced (like the student's own `/app/stream` call), and on receipt show `liveCode` **without** unlocking
  the editor or firing the "updated" toast — those only belong to the final save below
- `SEND /app/edit/{roomCode}/{participantId}` — teacher saves an edit (raw text body = new code); persists it and
  broadcasts `{participantId, nickname, code}` on the `/edit` topic, which the student treats as both the new code
  and an implicit unlock
- `SEND /app/execution/{roomCode}/{participantId}` — broadcast an execution result
- `SUBSCRIBE /topic/room/{roomCode}/participants` — online/offline status, new-participant joins
- `SUBSCRIBE /topic/room/{roomCode}/participant/{participantId}` — code stream / watch response
- `SUBSCRIBE /topic/room/{roomCode}/participant/{participantId}/edit` — edit-lock state + saved teacher edits
- `SUBSCRIBE /topic/room/{roomCode}/executions`
- `SUBSCRIBE /topic/room/{roomCode}/status` — room lifecycle events. Currently only fires
  `{"roomClosed":true}`, broadcast once by `DELETE /api/v1/rooms/:roomCode` right after the room is marked
  `PASSIVE` (see `room.service.js#deleteRoom`). Not tied to a specific participant, so **both** the teacher
  dashboard and every student tab in the room should subscribe to it and redirect to the home page on
  `roomClosed` — the frontend doesn't do this yet, this is backend-only for now.

## ⚠️ Security note

This backend no longer talks to the Supabase Postgres instance the Java app
used, but that Supabase credential is still committed in plain text in
`DevRoom/src/main/resources/application.yaml` (tracked by git in that repo).
If that database is still in use anywhere, rotate the password in Supabase
regardless — `.env` here being git-ignored doesn't undo the earlier exposure.

Your new `MONGODB_URI` in `.env` is git-ignored too, but treat it the same
way: never commit it, and rotate the Atlas password if it's ever pasted
somewhere public.
