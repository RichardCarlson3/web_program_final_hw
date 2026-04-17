import {
  createInitialJournalSession,
  getAuthenticatedUser,
  recordFilter,
  recordPageView,
  recordSearch,
  signInAuthenticatedUser,
  signOutAuthenticatedUser,
  touchJournalSession,
  type JournalSessionStore,
} from "../../src/session/JournalSession";

describe("JournalSession", () => {
  it("creates an anonymous browser session and increments visit counts per page load", () => {
    const store = {} as JournalSessionStore;

    const firstView = recordPageView(store, new Date("2026-03-15T10:00:00.000Z"));
    const secondView = recordPageView(store, new Date("2026-03-15T11:00:00.000Z"));

    expect(firstView.browserId).toBeDefined();
    expect(firstView.browserLabel).toContain("Browser");
    expect(firstView.visitCount).toBe(1);
    expect(firstView.lastFilter).toBe("all");
    expect(firstView.lastSearch).toBe("");
    expect(secondView.browserId).toBe(firstView.browserId);
    expect(secondView.visitCount).toBe(2);
    expect(secondView.lastSeenAt).toBe("2026-03-15T11:00:00.000Z");
  });

  it("stores only lightweight browser-specific state like search and filter preferences", () => {
    const store = {
      journal: createInitialJournalSession(
        new Date("2026-03-15T09:00:00.000Z"),
        "browser-session-demo",
      ),
    } as JournalSessionStore;

    const touched = touchJournalSession(store, new Date("2026-03-15T09:15:00.000Z"));
    const searched = recordSearch(store, "  beta query  ", new Date("2026-03-15T09:20:00.000Z"));
    const filtered = recordFilter(store, "completed", new Date("2026-03-15T09:25:00.000Z"));

    expect(touched.visitCount).toBe(0);
    expect(searched.lastSearch).toBe("beta query");
    expect(filtered.lastFilter).toBe("completed");
    expect(filtered.browserId).toBe("browser-session-demo");
    expect(filtered.createdAt).toBe("2026-03-15T09:00:00.000Z");
  });

  it("stores authenticated identity in the session without storing a password", () => {
    const store = {
      journal: createInitialJournalSession(new Date("2026-03-15T09:00:00.000Z"), "browser-auth"),
    } as JournalSessionStore;

    const signedIn = signInAuthenticatedUser(
      store,
      {
        id: "user-alice",
        email: "alice@journal.test",
        displayName: "Alice Journal",
      },
      new Date("2026-03-15T09:30:00.000Z"),
    );
    const signedOut = signOutAuthenticatedUser(store, new Date("2026-03-15T09:45:00.000Z"));

    expect(signedIn.authenticatedUser?.email).toBe("alice@journal.test");
    expect(signedIn.authenticatedUser?.signedInAt).toBe("2026-03-15T09:30:00.000Z");
    expect(getAuthenticatedUser(store)).toBeNull();
    expect(signedOut.authenticatedUser).toBeNull();
  });
});
