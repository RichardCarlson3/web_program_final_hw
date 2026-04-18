import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Err, Ok, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRecord } from "./User";
import type { CreateUserInput, IUserRepository } from "./UserRepository";

class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const row = await this.prisma.user.findUnique({ where: { email } });

      if (!row) {
        return Ok(null);
      }

      return Ok({
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        password: row.password,
      });
    } catch {
      return Err(UnexpectedDependencyError("Unable to read user from database."));
    }
  }

  async create(input: CreateUserInput): Promise<Result<IUserRecord, AuthError>> {
    try {
      const created = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          email: input.email,
          displayName: input.displayName,
          password: input.password,
        },
      });

      return Ok({
        id: created.id,
        email: created.email,
        displayName: created.displayName,
        password: created.password,
      });
    } catch {
      return Err(UnexpectedDependencyError("Unable to create user in database."));
    }
  }
}

export function CreatePrismaUserRepository(prisma: PrismaClient): IUserRepository {
  return new PrismaUserRepository(prisma);
}