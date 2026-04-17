import request from "supertest";
import type { Express } from "express";
import { createComposedApp } from "../../src/composition";
import type { ILoggingService } from "../../src/service/LoggingService";

function makeSilentLogger(): ILoggingService {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

async function loginAsDemoUser(agent: ReturnType<typeof request.agent>) {
  const response = await agent.post("/login").type("form").send({
    email: "alice@journal.test",
    password: "password123",
  });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe("/entries");
}

describe("HTTP contract verification", () => {
  let app: Express;

  beforeEach(() => {
    app = createComposedApp("memory", makeSilentLogger()).getExpressApp();
  });

  it("redirects / to /login when the browser is not authenticated", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("renders the login page and the session panel", async () => {
    const response = await request(app).get("/login");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Journal App Login");
    expect(response.text).toContain("Browser Session");
    expect(response.text).toContain("alice@journal.test");
  });

  it("redirects unauthenticated requests away from the journal dashboard", async () => {
    const response = await request(app).get("/entries");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("creates an anonymous browser session on first login-page request", async () => {
    const response = await request(app).get("/login");

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.text).toContain('id="session-browser-id"');
    expect(response.text).toContain('id="session-visit-count">1<');
    expect(response.text).toContain('id="session-auth-status"');
    expect(response.text).toContain("anonymous");
  });

  it("shows an authentication error for bad login credentials", async () => {
    const response = await request(app).post("/login").type("form").send({
      email: "alice@journal.test",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.text).toContain("Authentication Error");
    expect(response.text).toContain("Invalid email or password.");
  });

  it("renders the journal dashboard after a successful login", async () => {
    const agent = request.agent(app);

    await loginAsDemoUser(agent);

    const response = await agent.get("/entries");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Journal Entries Dashboard");
    expect(response.text).toContain("Signed in as");
    expect(response.text).toContain("Alice Journal");
    expect(response.text).toContain('id="session-auth-status"');
    expect(response.text).toContain("authenticated");
  });

  it("returns an error fragment for invalid create input", async () => {
    const agent = request.agent(app);
    await loginAsDemoUser(agent);

    const response = await agent
      .post("/entries/new")
      .type("form")
      .send({ title: "No", body: "short", tag: "BAD TAG" });

    expect(response.status).toBe(400);
    expect(response.text).toContain("Entry Error");
    expect(response.text).toContain("Title must be at least 3 characters.");
  });

  it("returns 400 for invalid toggle IDs", async () => {
    const agent = request.agent(app);
    await loginAsDemoUser(agent);

    const response = await agent.post("/entries/not-a-number/toggle");

    expect(response.status).toBe(400);
    expect(response.text).toContain("Invalid ID.");
  });

  it("returns 400 for invalid status filters", async () => {
    const agent = request.agent(app);
    await loginAsDemoUser(agent);

    const response = await agent.get("/entries/filter").query({ status: "done" });

    expect(response.status).toBe(400);
    expect(response.text).toContain("Status filter must be all, active, or completed.");
  });

  it("returns to the login page after logout", async () => {
    const agent = request.agent(app);
    await loginAsDemoUser(agent);

    const logoutResponse = await agent.post("/logout");
    const loginResponse = await agent.get("/login");

    expect(logoutResponse.status).toBe(302);
    expect(logoutResponse.headers.location).toBe("/login");
    expect(loginResponse.text).toContain("Journal App Login");
    expect(loginResponse.text).toContain("(none)");
  });
});
