# Lecture 8.12 Concepts: Authentication on Top of Sessions

## Overview

In lecture 8.12 we keep the 6.11 session support and add authentication. The purpose is
to show how a session can move from "this is browser A" to "browser A is signed in as
Alice" without introducing authorization yet.

## Big Picture

This version combines six ideas:

- sessions are the storage mechanism that make login state persist across requests,
- authentication needs its own repository/service/controller slice,
- protected routes should fail clearly when the browser is not authenticated,
- the session should store authenticated identity, not passwords,
- authentication and authorization are different concerns,
- the same auth flow should work with both journal repository modes.

## Concepts List

- Authentication builds on sessions
- A separate auth slice keeps the design teachable
- What belongs in an authenticated session
- Protected routes
- Authentication is not authorization
- Demo users and learning-focused simplifications
- E2E verification across browsers and repository modes

## Authentication builds on sessions

The login flow uses the existing session middleware from 6.11. After a successful login,
the app stores the authenticated identity in the session object.

Why: The session is what lets a signed-in browser stay signed in across later requests.

## A separate auth slice keeps the design teachable

This version adds an auth repository, auth service, and auth controller instead of mixing
login logic into the journal service or route handlers.

Why: Students should be able to see authentication as its own application concern.

## What belongs in an authenticated session

This app stores:

- browser identity and timestamps,
- lightweight UI state,
- authenticated user identity (`userId`, `email`, `displayName`, `signedInAt`).

Why: The session should remember who is signed in, but it should not become a copy of the
database.

## Protected routes

The journal routes now require an authenticated session. Unauthenticated browsers are
redirected to `/login`, and protected HTMX requests return `401` fragments.

Why: Authentication should have an observable effect on the route behavior.

## Authentication is not authorization

In this lecture, once a user is authenticated they can use the whole app. There are no
role checks and no "user owns this record" rules yet.

Why: Students should separate "who are you?" from "what are you allowed to do?"

## Demo users and learning-focused simplifications

The demo users live in an in-memory repository and the password comparison is intentionally
simple in this branch.

Why: The goal here is to teach the auth flow and session shape first. Password hashing and
persistent user storage can be introduced in later steps.

## E2E verification across browsers and repository modes

The test suite now verifies two different browser agents can authenticate as different demo
users while keeping separate session state, and that the journal flow still works in both
`memory` and `prisma` modes.

Why: Authentication is only convincing if it works across repeated requests, separate
browsers, and both persistence modes.
