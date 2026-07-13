<div align="center">

<img src=".github/assets/icon.svg" width="56" height="56" alt="Kanvas logo" />

# Kaban API

**Backend for Kanvas — a real-time Kanban board for teams.**

[![NestJS](https://img.shields.io/badge/NestJS-11-EA2845?logo=nestjs&logoColor=white)](https://nestjs.com) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org) [![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io) [![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io) [![BullMQ](https://img.shields.io/badge/BullMQ-queue-CC3534)](https://bullmq.io) [![Socket.IO](https://img.shields.io/badge/Socket.IO-server-black?logo=socketdotio&logoColor=white)](https://socket.io)
[![CI/CD](https://github.com/LeeManh/kaban-api/actions/workflows/deploy.yml/badge.svg)](https://github.com/LeeManh/kaban-api/actions/workflows/deploy.yml)

</div>

<details>
<summary>Table of Contents</summary>

- [About](#about)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Deployment](#deployment)

</details>

## About

Backend for **Kanvas** — a real-time Kanban board for teams: boards, lists, cards, and live collaboration. Exposes a REST API and a Socket.IO gateway consumed by the [kaban-fe](https://github.com/LeeManh/kaban-fe) frontend.

## Tech Stack

| Layer           | Technology                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | NestJS (TypeScript)                                    |
| Database        | PostgreSQL via Prisma ORM (`@prisma/adapter-pg`)       |
| Cache / session | Redis (`ioredis`)                                      |
| Job queues      | BullMQ                                                 |
| Real-time       | Socket.IO                                              |
| Object storage  | S3-compatible (MinIO locally, AWS S3 in production)    |
| Email           | Nodemailer + Handlebars, sent via Resend in production |
| Auth            | JWT (access + refresh tokens, `jti` tracking)          |
| Error tracking  | Sentry                                                 |

## Features

- **Auth**: register/login, refresh tokens, logout/logout-all (kicks all sockets), forgot/reset password.
- **Boards**: CRUD, background image (presigned upload), star/favorite, recently viewed, search.
- **Board sharing**: add members directly, change roles, invite by email (existing or new accounts), invite links (OPEN/APPROVAL mode + join requests).
- **Lists**: CRUD, drag-and-drop reordering (sparse numeric `order`), copy list (remaps labels by name+color if copying across boards), move list (same board or to another board — preserves comments/attachments/valid assignees), move all cards to another list.
- **Cards**: CRUD, priority, due date + configurable reminder offset (minutes before due), cover image, markdown description with embedded images, checklists, labels, assignees, attachments, comments.
- **Notifications**: in-app + email, per-type toggles (comments, due dates, removed from card, attachments, card moved), always-on for invites/assignments.
- **Real-time**: every board/list/card/comment/checklist/label/notification change broadcasts via Socket.IO to the right room; sockets are auto-kicked on board removal or logout.

## Getting Started

**Prerequisites**: Node.js (LTS), npm, Docker (for local Postgres/Redis/MinIO).

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Copy `.env.example` to `.env` and fill in the values (Postgres, Redis, JWT secrets, S3/MinIO, SMTP...).

Spin up local infra (Postgres, Redis, MinIO) with Docker:

```bash
docker compose up -d
```

### 3. Migrate and seed test data

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Run the dev server

```bash
npm run start:dev
```

The API runs at `http://localhost:3000/api` by default.

## Scripts

```bash
npm run start:dev     # dev server, watch mode
npm run build          # build to dist/
npm run start:prod     # run the built app
npm run lint           # eslint --fix
npm run test           # unit tests (jest)
npm run test:e2e       # e2e tests
```

## Project Structure

```
src/
  auth/            JWT, refresh tokens, forgot/reset password
  boards/          Board, member, invite-link, join-request
  lists/            List CRUD, move, copy
  cards/            Card CRUD, assignees, checklist relations
  checklists/       Checklist + checklist item
  labels/           Label CRUD
  comments/         Comment + embedded images
  attachments/      Attachment upload (presigned)
  invites/          Board invite (email) + invite link
  notifications/    Notification + preferences + due-reminder queue
  users/            Profile, avatar, password change
  mail/             Mail queue + Handlebars templates
  events/           EventEmitter2 (APP_EVENT) + Socket.IO gateway
  storage/          S3 client, presigned URLs, markdown image resolution
  redis/            Token blacklist, reset tokens
  prisma/           PrismaService
  config/           Typed config per module (app, db, jwt, storage, mail...)
  common/           Shared guards, decorators, filters
prisma/
  schema.prisma     Data model
  migrations/       Migration history
  seed.ts           Test seed data (run via tsx)
docs/               Architecture, upload flow, deployment stack docs
deploy/             Nginx config for VPS production
```

## Deployment

Production runs on a VPS via Docker: GitHub Actions builds the image, pushes it to GHCR, and the VPS only `pull`s + `docker compose up -d` (no build on the VPS).
