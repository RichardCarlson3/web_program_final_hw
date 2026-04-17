# The Journal App

A Journal Application for demonstration purposes.

## Overview

This version is lecture 8.12 of the journal app. It extends 6.11 by adding
authentication on top of the existing session support.

The important change in 8.12 is that the app now supports:

- a small authentication slice with its own repository, service, and controller,
- demo login and logout flows built on top of the 6.11 session middleware,
- protected journal routes that require an authenticated session,
- a session object that now stores both browser state and authenticated identity,
- the same journal workflow from 6.10 across both in-memory and Prisma repositories.

## Quick Start

```bash
cd 8.12-journal-app
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run test
npm run build
```

Use `REPO_MODE=memory` (default) or `REPO_MODE=prisma` in `.env`. You can also set a
local `SESSION_SECRET`:

```bash
REPO_MODE=prisma
SESSION_SECRET="lecture-6.11-demo-secret"
```

## Demo Login Accounts

This lecture uses two in-memory demo users:

- `alice@journal.test` / `password123`
- `bob@journal.test` / `password123`

These are intentionally simple so students can focus on the authentication flow before
adding a persistent user model.

## What the Session Stores Now

The browser session object in this lecture stores:

- `browserId`
- `browserLabel`
- `visitCount`
- `createdAt`
- `lastSeenAt`
- `lastSearch`
- `lastFilter`
- `authenticatedUser`

The `authenticatedUser` value contains only identity information:

- `userId`
- `email`
- `displayName`
- `signedInAt`

The session does not store the password.

## Authentication vs Authorization

8.12 adds authentication, which means the app can verify a login and remember the signed-in
user in the session.

8.12 still does not add authorization. Every authenticated user can access the same journal
workflow. There are no roles, ownership checks, or permission rules yet.

## Notes

- The session middleware still uses the default in-memory store because this branch is a
  classroom demonstration.
- The user repository is also in-memory for the same reason.
- Password comparison is intentionally simplified in this lecture branch so students can
  see the auth flow clearly before introducing password hashing.
- `npm run prisma:generate` and `npm run prisma:migrate` still matter for the Prisma
  journal repository path.

## Reading

Please read the following documents:

- [CONCEPTS.md](CONCEPTS.md): concepts for the 8.12 authentication and session model.
- [CHANGES.md](CHANGES.md): a walkthrough from 6.11 session support to 8.12 login and
  protected routes.
