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
}

describe("HTMX contract verification", () => {
  let app: Express;

  beforeEach(() => {
    app = createComposedApp("memory", makeSilentLogger()).getExpressApp();
  });

  it("creates an entry and returns the updated list fragment", async () => {
    const agent = request.agent(app);

    await loginAsDemoUser(agent);

    const response = await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "Reading notes",
        body: "This body is long enough to be valid.",
        tag: "reading",
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Reading notes");
    expect(response.text).toContain("reading");
    expect(response.text).not.toContain("<html>");
    expect(response.text).toContain('hx-swap-oob="true"');
    expect(response.text).toContain('id="session-browser-id"');
    expect(response.text).toContain('id="session-auth-status"');
    expect(response.text).toContain("authenticated");
  });

  it("toggles an entry and returns the updated list fragment", async () => {
    const agent = request.agent(app);

    await loginAsDemoUser(agent);

    await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "Project journal",
        body: "This body is long enough to be valid.",
        tag: "project",
      });

    const response = await agent.post("/entries/1/toggle");

    expect(response.status).toBe(200);
    expect(response.text).toContain("completed");
    expect(response.text).toContain("Mark Active");
  });

  it("searches by title/body/tag and returns a fragment", async () => {
    const agent = request.agent(app);

    await loginAsDemoUser(agent);

    await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "Alpha note",
        body: "This body is long enough to be valid.",
        tag: "alpha",
      });
    await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "Beta note",
        body: "Another body that is long enough.",
        tag: "beta",
      });

    const response = await agent.get("/entries/search").query({ q: "beta" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Beta note");
    expect(response.text).not.toContain("Alpha note");
    expect(response.text).toContain('id="session-last-search">beta<');
  });

  it("filters completed entries and returns only matching rows", async () => {
    const agent = request.agent(app);

    await loginAsDemoUser(agent);

    await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "First journal",
        body: "This body is long enough to be valid.",
        tag: "general",
      });
    await agent
      .post("/entries/new")
      .type("form")
      .send({
        title: "Second journal",
        body: "Another valid body for a journal entry.",
        tag: "general",
      });
    await agent.post("/entries/1/toggle");

    const response = await agent.get("/entries/filter").query({ status: "completed" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("First journal");
    expect(response.text).not.toContain("Second journal");
    expect(response.text).toContain('id="session-last-filter">completed<');
  });

  it("returns a 401 fragment for protected HTMX routes when the browser is signed out", async () => {
    const response = await request(app)
      .post("/entries/new")
      .set("HX-Request", "true")
      .type("form")
      .send({
        title: "Should fail",
        body: "This body is long enough to be valid.",
        tag: "auth",
      });

    expect(response.status).toBe(401);
    expect(response.text).toContain("Please log in to continue.");
  });
});
