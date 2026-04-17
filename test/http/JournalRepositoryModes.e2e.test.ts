import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createComposedApp } from "../../src/composition";
import type { ILoggingService } from "../../src/service/LoggingService";

function makeSilentLogger(): ILoggingService {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function extractSessionField(html: string, id: string): string {
  const match = html.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<`));

  if (!match) {
    throw new Error(`Unable to find session field ${id}`);
  }

  return match[1].trim();
}

async function loginAsDemoUser(
  agent: ReturnType<typeof request.agent>,
  email = "alice@journal.test",
) {
  const response = await agent.post("/login").type("form").send({
    email,
    password: "password123",
  });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe("/entries");
}

function runSuite(mode: "memory" | "prisma") {
  describe(`Journal routes e2e (${mode})`, () => {
    const prisma =
      mode === "prisma"
        ? new PrismaClient({
            adapter: new PrismaBetterSqlite3({
              url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
            }),
          })
        : null;

    beforeEach(async () => {
      if (prisma) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "JournalEntry" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "title" TEXT NOT NULL,
            "body" TEXT NOT NULL,
            "tag" TEXT NOT NULL DEFAULT 'general',
            "status" TEXT NOT NULL DEFAULT 'active',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await prisma.journalEntry.deleteMany();
      }
    });

    afterAll(async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
    });

    it("redirects unauthenticated browsers to the login page", async () => {
      const app = createComposedApp(mode, makeSilentLogger()).getExpressApp();
      const response = await request(app).get("/entries");

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("/login");
    });

    it("creates and toggles a journal entry", async () => {
      const app = createComposedApp(mode, makeSilentLogger()).getExpressApp();
      const agent = request.agent(app);

      await loginAsDemoUser(agent);

      await agent
        .post("/entries/new")
        .type("form")
        .send({
          title: "Persistence test",
          body: "This body is long enough to be valid.",
          tag: "storage",
        });

      const toggleId = prisma
        ? (await prisma.journalEntry.findFirst({
            where: { title: "Persistence test" },
            orderBy: { id: "desc" },
          }))?.id
        : 1;

      expect(toggleId).toBeDefined();

      const toggleResponse = await agent.post(`/entries/${toggleId}/toggle`);
      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.text).toContain("completed");
    });

    it("searches and filters journal entries", async () => {
      const app = createComposedApp(mode, makeSilentLogger()).getExpressApp();
      const agent = request.agent(app);

      await loginAsDemoUser(agent);

      await agent
        .post("/entries/new")
        .type("form")
        .send({
          title: "Alpha entry",
          body: "This body is long enough to be valid.",
          tag: "alpha",
        });
      await agent
        .post("/entries/new")
        .type("form")
        .send({
          title: "Beta entry",
          body: "Another valid body for the journal app.",
          tag: "beta",
        });
      const toggleId = prisma
        ? (await prisma.journalEntry.findFirst({
            where: { title: "Alpha entry" },
            orderBy: { id: "desc" },
          }))?.id
        : 1;

      expect(toggleId).toBeDefined();
      await agent.post(`/entries/${toggleId}/toggle`);

      const searchResponse = await agent.get("/entries/search").query({ q: "beta" });
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.text).toContain("Beta entry");
      expect(searchResponse.text).not.toContain("Alpha entry");

      const filterResponse = await agent
        .get("/entries/filter")
        .query({ status: "completed" });
      expect(filterResponse.status).toBe(200);
      expect(filterResponse.text).toContain("Alpha entry");
      expect(filterResponse.text).not.toContain("Beta entry");
    });

    it("keeps separate authenticated sessions for different browser agents", async () => {
      const app = createComposedApp(mode, makeSilentLogger()).getExpressApp();
      const browserA = request.agent(app);
      const browserB = request.agent(app);

      await loginAsDemoUser(browserA, "alice@journal.test");
      await loginAsDemoUser(browserB, "bob@journal.test");

      const firstBrowserA = await browserA.get("/entries");
      const secondBrowserA = await browserA.get("/entries");
      const firstBrowserB = await browserB.get("/entries");

      const browserAId = extractSessionField(firstBrowserA.text, "session-browser-id");
      const browserASecondId = extractSessionField(secondBrowserA.text, "session-browser-id");
      const browserBId = extractSessionField(firstBrowserB.text, "session-browser-id");
      const browserAUser = extractSessionField(firstBrowserA.text, "session-user-email");
      const browserBUser = extractSessionField(firstBrowserB.text, "session-user-email");
      const browserAFirstCount = Number(
        extractSessionField(firstBrowserA.text, "session-visit-count"),
      );
      const browserASecondCount = Number(
        extractSessionField(secondBrowserA.text, "session-visit-count"),
      );
      const browserBFirstCount = Number(
        extractSessionField(firstBrowserB.text, "session-visit-count"),
      );

      expect(browserAId).toBe(browserASecondId);
      expect(browserAId).not.toBe(browserBId);
      expect(browserAUser).toBe("alice@journal.test");
      expect(browserBUser).toBe("bob@journal.test");
      expect(browserAFirstCount).toBe(1);
      expect(browserASecondCount).toBe(2);
      expect(browserBFirstCount).toBe(1);
    });
  });
}

runSuite("memory");
runSuite("prisma");
