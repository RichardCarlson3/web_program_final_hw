# Changes: 6.11 -> 8.12 Authentication

## Summary

This version takes the 6.11 session-enabled journal app and adds authentication. The app
can now sign a user in, remember that user in the session, protect the journal routes,
and sign the user out again.

## Step 1. Keep the 6.11 Session Foundation

What stays the same:

- the browser session middleware,
- the journal repository modes,
- the create, toggle, search, and filter journal workflow,
- the Prisma schema and migration setup.

Why:

- 8.12 is about building on the session foundation, not replacing it.

## Step 2. Add an Authentication Slice

What changed:

- added an auth repository,
- added an auth service,
- added an auth controller,
- wired those pieces into composition.

Why:

- Authentication is easier to teach when it has its own small, explicit architecture.

## Step 3. Add Demo Users

What changed:

- added two in-memory demo users,
- added a login form with demo credentials,
- added login validation and credential checks.

Why:

- Students need a concrete login flow before dealing with persistent user storage.

## Step 4. Extend the Session Object

What changed:

- the session now keeps authenticated identity in addition to browser state,
- the session stores `userId`, `email`, `displayName`, and `signedInAt`,
- the session does not store the password.

Why:

- Authentication needs durable request-to-request identity, and the session is the right
  place for that.

## Step 5. Protect the Journal Routes

What changed:

- unauthenticated browsers are redirected to `/login`,
- protected HTMX routes return `401` fragments,
- authenticated browsers can use the same journal workflow as before.

Why:

- Authentication should change what routes are available before any authorization rules
  are introduced.

## Step 6. Update the UI

What changed:

- added a login page,
- updated the navigation with sign-in status and logout,
- updated the session panel to show authentication fields,
- updated the dashboard intro to show the current signed-in user.

Why:

- Students learn auth faster when the UI makes the session changes visible.

## Step 7. Add Authentication Tests

What changed:

- added unit tests for the auth service,
- expanded session tests to cover sign-in/sign-out session state,
- updated HTTP and HTMX tests for login and protected routes,
- updated E2E tests to verify separate authenticated browser sessions in both repository
  modes.

Why:

- Authentication is stateful, so it needs tests that exercise route protection, repeated
  requests, and separate browser agents.
