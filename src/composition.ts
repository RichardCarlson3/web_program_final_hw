import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePrismaUserRepository } from "./auth/PrismaUserRepository";
import { CreateRegistrationService } from "./auth/RegistrationService";
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

  const prisma =
    mode === "prisma"
      ? new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
          }),
        })
      : null;

  const journalRepository =
    mode === "prisma" && prisma
      ? CreatePrismaJournalRepository(prisma)
      : CreateInMemoryJournalRepository();

  const userRepository =
    mode === "prisma" && prisma
      ? CreatePrismaUserRepository(prisma)
      : CreateInMemoryUserRepository();

  const journalService = CreateJournalService(journalRepository);
  const authService = CreateAuthService(userRepository);
  const registrationService = CreateRegistrationService(userRepository);
  const authController = CreateAuthController(
    authService,
    registrationService,
    resolvedLogger,
  );
  const controller = CreateJournalController(journalService, resolvedLogger);

  return CreateApp(controller, authController, resolvedLogger);
}