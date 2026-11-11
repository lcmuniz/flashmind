# FlashMind 🧠

[![CI](https://github.com/lcmuniz/flashmind/actions/workflows/ci.yml/badge.svg)](https://github.com/lcmuniz/flashmind/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

FlashMind is a full-stack **spaced-repetition** flashcard app. It schedules reviews with an
SM-2-based algorithm (with learning steps), so you study each card right before you would forget it.

**Stack:** React 19 + Vite + Tailwind CSS · Node.js + Express · PostgreSQL · JWT auth

> 🇧🇷 *Resumo em português no final.*

## Features

- **Decks and cards** with optional image/video URLs.
- **SM-2 scheduling**: cards move from *New* → *Learning* → *Review*; answers (Again / Hard / Good / Easy) adjust the interval and ease factor.
- **Import / export** of all decks as plain text (backup or bulk creation).
- **Keyboard-first study session** (see shortcuts below).
- **Per-user data isolation**: every deck/card route checks ownership on the server.

## Architecture

```
src/                 React SPA (Vite)
  lib/scheduler.js   SM-2 scheduling — pure function, unit tested
  lib/deckText.js    Plain-text import/export — unit tested
  lib/api.js         REST client
server/
  app.js             Express app factory (dependencies injected → testable without a DB)
  index.js           Entry point: reads env vars, starts the server
  schema.sql         PostgreSQL schema
test/                node:test + supertest
```

## Security

- Passwords hashed with **bcrypt**; minimum length enforced on sign-up.
- **JWT** signed with HS256, with expiration (`JWT_EXPIRES_IN`, default 7 days). The server **refuses to start** without a `JWT_SECRET` of at least 32 characters.
- **Rate limiting** on login and sign-up (20 requests / 15 min per IP).
- **CORS** restricted to the origins listed in `CORS_ORIGIN`.
- Ids are validated, all queries are parameterized, and errors return a generic message (details only in server logs).

## Getting started

Requirements: Node.js 20+ and PostgreSQL.

```bash
git clone https://github.com/lcmuniz/flashmind.git
cd flashmind
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET (openssl rand -hex 32)
npm run db:init           # creates the "flashmind" schema and tables
```

Run backend and frontend in two terminals:

```bash
npm run server   # API on http://localhost:3000
npm run dev      # app on http://localhost:5173
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run server` | Express API |
| `npm run db:init` | Create database schema |
| `npm test` | Unit and API tests (no database needed) |
| `npm run lint` | ESLint |
| `npm run build` | Production build of the frontend |

## Import format

```text
Deck: Deck name
P: Question
R: Answer
---
```

## Keyboard shortcuts

| Where | Key | Action |
| --- | --- | --- |
| Deck | `E` | Start studying |
| Deck | `Esc` | Close "new card" dialog |
| Study | `Enter` | Reveal answer |
| Study | `E` / `D` / `B` / `F` | Again / Hard / Good / Easy (*Errei, Difícil, Bom, Fácil*) |
| Study | `Esc` or `V` | Back to dashboard |

The interface is in Portuguese (pt-BR).

## License

[MIT](LICENSE)

---

## 🇧🇷 Resumo em português

FlashMind é um app de flashcards com **repetição espaçada** (algoritmo SM-2), feito com React + Vite no
frontend e Node.js/Express + PostgreSQL no backend, com autenticação JWT.

Para rodar: `npm install`, copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`
(no mínimo 32 caracteres), rode `npm run db:init` e depois `npm run server` e `npm run dev`.
Os testes rodam com `npm test`, sem precisar de banco de dados.
