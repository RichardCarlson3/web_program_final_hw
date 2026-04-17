import { randomUUID } from "node:crypto";
import type { Session, SessionData } from "express-session";
import type { IAuthenticatedUser } from "../auth/User";
import type { JournalFilterStatus } from "../repository/JournalRespository";

export interface IAuthenticatedUserSession {
  userId: string;
  email: string;
  displayName: string;
  signedInAt: string;
}

export interface IJournalBrowserSession {
  browserId: string;
  browserLabel: string;
  visitCount: number;
  createdAt: string;
  lastSeenAt: string;
  lastSearch: string;
  lastFilter: JournalFilterStatus;
  authenticatedUser: IAuthenticatedUserSession | null;
}

export type JournalSessionStore = Session &
  Partial<SessionData> & {
    journal?: IJournalBrowserSession;
  };

function createBrowserLabel(browserId: string): string {
  return `Browser ${browserId.slice(0, 4).toUpperCase()}`;
}

export function isJournalFilterStatus(value: string): value is JournalFilterStatus {
  return value === "all" || value === "active" || value === "completed";
}

export function createInitialJournalSession(
  now: Date = new Date(),
  browserId: string = randomUUID(),
): IJournalBrowserSession {
  const timestamp = now.toISOString();

  return {
    browserId,
    browserLabel: createBrowserLabel(browserId),
    visitCount: 0,
    createdAt: timestamp,
    lastSeenAt: timestamp,
    lastSearch: "",
    lastFilter: "all",
    authenticatedUser: null,
  };
}

function ensureJournalSession(
  store: JournalSessionStore,
  now: Date = new Date(),
): IJournalBrowserSession {
  if (!store.journal) {
    store.journal = createInitialJournalSession(now);
  }

  return store.journal;
}

function snapshotSession(session: IJournalBrowserSession): IJournalBrowserSession {
  return { ...session };
}

export function recordPageView(
  store: JournalSessionStore,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.visitCount += 1;
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

export function touchJournalSession(
  store: JournalSessionStore,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

export function recordSearch(
  store: JournalSessionStore,
  query: string,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.lastSearch = query.trim();
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

export function recordFilter(
  store: JournalSessionStore,
  status: JournalFilterStatus,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.lastFilter = status;
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

// The session stores authenticated identity only; passwords stay out of the session.
export function signInAuthenticatedUser(
  store: JournalSessionStore,
  user: IAuthenticatedUser,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.authenticatedUser = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    signedInAt: now.toISOString(),
  };
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

export function signOutAuthenticatedUser(
  store: JournalSessionStore,
  now: Date = new Date(),
): IJournalBrowserSession {
  const session = ensureJournalSession(store, now);
  session.authenticatedUser = null;
  session.lastSeenAt = now.toISOString();
  return snapshotSession(session);
}

export function getAuthenticatedUser(
  store: JournalSessionStore,
  now: Date = new Date(),
): IAuthenticatedUserSession | null {
  return ensureJournalSession(store, now).authenticatedUser;
}

export function isAuthenticatedSession(
  store: JournalSessionStore,
  now: Date = new Date(),
): boolean {
  return getAuthenticatedUser(store, now) !== null;
}
