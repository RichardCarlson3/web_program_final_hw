import { Err, Ok, type Result } from "../lib/result";
import {
  UnexpectedDependencyError,
  UserAlreadyExists,
  ValidationError,
  type AuthError,
} from "./errors";
import { toAuthenticatedUser, type IAuthenticatedUser } from "./User";
import type { CreateUserInput, IUserRepository } from "./UserRepository";

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

export interface IRegistrationService {
  register(input: RegisterInput): Promise<Result<IAuthenticatedUser, AuthError>>;
}

class RegistrationService implements IRegistrationService {
  constructor(private readonly users: IUserRepository) {}

  async register(input: RegisterInput): Promise<Result<IAuthenticatedUser, AuthError>> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const password = input.password.trim();
    const confirmPassword = input.confirmPassword;

    if (!email || !email.includes("@")) {
      return Err(ValidationError("Email must look like an email address."));
    }

    if (!displayName) {
      return Err(ValidationError("Display name is required."));
    }

    if (password.length < 8) {
      return Err(ValidationError("Password must be at least 8 characters."));
    }

    if (password !== confirmPassword) {
      return Err(ValidationError("Password and confirmation password must match."));
    }

    const existing = await this.users.findByEmail(email);
    if (!existing.ok) {
      return Err(UnexpectedDependencyError(existing.value.message));
    }

    if (existing.value) {
      return Err(UserAlreadyExists("That email is already registered."));
    }

    const createInput: CreateUserInput = {
      email,
      displayName,
      password,
    };

    const created = await this.users.create(createInput);
    if (!created.ok) {
      return Err(UnexpectedDependencyError(created.value.message));
    }

    return Ok(toAuthenticatedUser(created.value));
  }
}

export function CreateRegistrationService(users: IUserRepository): IRegistrationService {
  return new RegistrationService(users);
}