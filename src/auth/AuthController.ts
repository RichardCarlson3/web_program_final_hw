import type { Response } from "express";
import {
  getAuthenticatedUser,
  signInAuthenticatedUser,
  signOutAuthenticatedUser,
  touchJournalSession,
  type IJournalBrowserSession,
  type JournalSessionStore,
} from "../session/JournalSession";
import type { ILoggingService } from "../service/LoggingService";
import type { IAuthService } from "./AuthService";
import type { AuthError } from "./errors";
import type { IRegistrationService, RegisterInput } from "./RegistrationService";

export interface IAuthController {
  showLogin(res: Response, session: IJournalBrowserSession, pageError?: string | null): Promise<void>;
  loginFromForm(
    res: Response,
    email: string,
    password: string,
    store: JournalSessionStore,
  ): Promise<void>;
  showRegister(
    res: Response,
    session: IJournalBrowserSession,
    pageError?: string | null,
  ): Promise<void>;
  registerFromForm(
    res: Response,
    input: RegisterInput,
    store: JournalSessionStore,
  ): Promise<void>;
  logoutFromForm(res: Response, store: JournalSessionStore): Promise<void>;
}

class AuthController implements IAuthController {
  constructor(
    private readonly service: IAuthService,
    private readonly registrationService: IRegistrationService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: AuthError): number {
    if (error.name === "InvalidCredentials") return 401;
    if (error.name === "ValidationError") return 400;
    if (error.name === "UserAlreadyExists") return 409;
    return 500;
  }

  async showLogin(
    res: Response,
    session: IJournalBrowserSession,
    pageError: string | null = null,
  ): Promise<void> {
    res.render("auth/login", { pageError, session });
  }

  async loginFromForm(
    res: Response,
    email: string,
    password: string,
    store: JournalSessionStore,
  ): Promise<void> {
    const session = touchJournalSession(store);
    const result = await this.service.authenticate({ email, password });

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Login failed: ${error.message}`);
      res.status(status);
      await this.showLogin(res, session, error.message);
      return;
    }

    const nextSession = signInAuthenticatedUser(store, result.value);
    this.logger.info(`Authenticated ${nextSession.authenticatedUser?.email ?? "unknown user"}`);
    res.redirect("/entries");
  }

  async showRegister(
    res: Response,
    session: IJournalBrowserSession,
    pageError: string | null = null,
  ): Promise<void> {
    res.render("auth/register", { pageError, session });
  }

  async registerFromForm(
    res: Response,
    input: RegisterInput,
    store: JournalSessionStore,
  ): Promise<void> {
    const session = touchJournalSession(store);
    const result = await this.registrationService.register(input);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Registration failed: ${error.message}`);
      res.status(status);
      await this.showRegister(res, session, error.message);
      return;
    }

    const nextSession = signInAuthenticatedUser(store, result.value);
    this.logger.info(`Registered ${nextSession.authenticatedUser?.email ?? "unknown user"}`);
    res.redirect("/entries");
  }

  async logoutFromForm(res: Response, store: JournalSessionStore): Promise<void> {
    const currentUser = getAuthenticatedUser(store);

    if (currentUser) {
      this.logger.info(`Signing out ${currentUser.email}`);
    }

    signOutAuthenticatedUser(store);
    res.redirect("/login");
  }
}

export function CreateAuthController(
  service: IAuthService,
  registrationService: IRegistrationService,
  logger: ILoggingService,
): IAuthController {
  return new AuthController(service, registrationService, logger);
}