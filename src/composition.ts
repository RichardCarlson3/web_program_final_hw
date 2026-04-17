import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateJournalController } from "./controller/JournalController";
import { CreateInMemoryJournalRepository } from "./repository/InMemoryJournalRepository";
import { CreatePrismaJournalRepository } from "./repository/PrismaJournalRepository";
import { CreateJournalService } from "./service/JournalService";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

export function createComposedApp(
  mode: "memory" | "prisma",
  logger?: ILoggingService,
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  const repository =
    mode === "prisma"
      ? CreatePrismaJournalRepository(
          new PrismaClient({
            adapter: new PrismaBetterSqlite3({
              url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
            }),
          }),
        )
      : CreateInMemoryJournalRepository();

  const service = CreateJournalService(repository);
  const authUsers = CreateInMemoryUserRepository();
  const authService = CreateAuthService(authUsers);
  const authController = CreateAuthController(authService, resolvedLogger);
  const controller = CreateJournalController(service, resolvedLogger);
  return CreateApp(controller, authController, resolvedLogger);
}
