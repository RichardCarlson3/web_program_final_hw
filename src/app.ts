import path from "node:path";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import Layouts from "express-ejs-layouts";
import { IAuthController } from "./auth/AuthController";
import { AuthenticationRequired } from "./auth/errors";
import { IApp } from "./contracts";
import { IJournalController } from "./controller/JournalController";
import { JournalFilterStatus } from "./repository/JournalRespository";
import {
  getAuthenticatedUser,
  isAuthenticatedSession,
  isJournalFilterStatus,
  JournalSessionStore,
  recordFilter,
  recordPageView,
  recordSearch,
  touchJournalSession,
} from "./session/JournalSession";
import { ILoggingService } from "./service/LoggingService";

type AsyncRequestHandler = RequestHandler;

function asyncHandler(fn: AsyncRequestHandler) {
  return function wrapped(req: Request, res: Response, next: (value?: unknown) => void) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sessionStore(req: Request): JournalSessionStore {
  return req.session as JournalSessionStore;
}

function nextFilterStatus(
  status: string,
  fallback: JournalSessionStore,
): JournalFilterStatus | undefined {
  if (isJournalFilterStatus(status)) {
    return status;
  }

  if (fallback.journal && isJournalFilterStatus(fallback.journal.lastFilter)) {
    return fallback.journal.lastFilter;
  }

  return undefined;
}

class ExpressApp implements IApp {
  private readonly app: express.Express;

  constructor(
    private readonly controller: IJournalController,
    private readonly authController: IAuthController,
    private readonly logger: ILoggingService,
  ) {
    this.app = express();
    this.registerMiddleware();
    this.registerTemplating();
    this.registerRoutes();
  }

  private registerMiddleware(): void {
    this.app.use(express.static(path.join(process.cwd(), "src/static")));
    this.app.use(
      session({
        name: "journal.sid",
        secret: process.env.SESSION_SECRET ?? "lecture-6.11-demo-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: "lax",
        },
      }),
    );
    this.app.use(Layouts);
    this.app.use(express.urlencoded({ extended: true }));
  }

  private registerTemplating(): void {
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(process.cwd(), "src/views"));
    this.app.set("layout", "layouts/base");
  }

  private isHtmxRequest(req: Request): boolean {
    return req.get("HX-Request") === "true";
  }

  private requireAuthenticated(req: Request, res: Response): boolean {
    const store = sessionStore(req);
    touchJournalSession(store);

    if (getAuthenticatedUser(store)) {
      return true;
    }

    this.logger.warn("Blocked unauthenticated request to a protected route");
    if (this.isHtmxRequest(req) || req.method !== "GET") {
      res.status(401).render("entries/partials/error", {
        message: AuthenticationRequired("Please log in to continue.").message,
        layout: false,
      });
      return false;
    }

    res.redirect("/login");
    return false;
  }

  private registerRoutes(): void {
    this.app.get(
      "/",
      asyncHandler(async (req, res) => {
        this.logger.info("GET /");
        const store = sessionStore(req);
        res.redirect(isAuthenticatedSession(store) ? "/entries" : "/login");
      }),
    );

    this.app.get(
      "/login",
      asyncHandler(async (req, res) => {
        const store = sessionStore(req);
        const browserSession = recordPageView(store);

        if (getAuthenticatedUser(store)) {
          res.redirect("/entries");
          return;
        }

        await this.authController.showLogin(res, browserSession);
      }),
    );

    this.app.post(
      "/login",
      asyncHandler(async (req, res) => {
        const email = typeof req.body.email === "string" ? req.body.email : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        await this.authController.loginFromForm(res, email, password, sessionStore(req));
      }),
    );

    this.app.get(
      "/register",
      asyncHandler(async (req, res) => {
        const store = sessionStore(req);
        const browserSession = recordPageView(store);
        await this.authController.showRegister(res, browserSession);
      }),
    );

    this.app.post(
      "/register",
      asyncHandler(async (req, res) => {
        const input = {
          email: typeof req.body.email === "string" ? req.body.email : "",
          displayName: typeof req.body.displayName === "string" ? req.body.displayName : "",
          password: typeof req.body.password === "string" ? req.body.password : "",
          confirmPassword:
            typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "",
        };

        await this.authController.registerFromForm(res, input, sessionStore(req));
      }),
    );

    this.app.post(
      "/logout",
      asyncHandler(async (req, res) => {
        await this.authController.logoutFromForm(res, sessionStore(req));
      }),
    );

    this.app.get(
      "/entries",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const browserSession = recordPageView(sessionStore(req));
        this.logger.info(`GET /entries for ${browserSession.browserLabel}`);
        await this.controller.showEntries(res, browserSession);
      }),
    );

    this.app.post(
      "/entries/new",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const browserSession = touchJournalSession(sessionStore(req));
        const title = typeof req.body.title === "string" ? req.body.title : "";
        const body = typeof req.body.body === "string" ? req.body.body : "";
        const tag = typeof req.body.tag === "string" ? req.body.tag : "general";
        await this.controller.createFromForm(res, title, body, tag, browserSession);
      }),
    );

    this.app.post(
      "/entries/:id/toggle",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const browserSession = touchJournalSession(sessionStore(req));
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          res.status(400).render("entries/partials/error", {
            message: "Invalid ID.",
            layout: false,
          });
          return;
        }

        await this.controller.toggleFromForm(res, id, browserSession);
      }),
    );

    this.app.get(
      "/entries/search",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const q = typeof req.query.q === "string" ? req.query.q : "";
        const browserSession = recordSearch(sessionStore(req), q);
        await this.controller.searchFromHtmx(res, q, browserSession);
      }),
    );

    this.app.get(
      "/entries/filter",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const status = typeof req.query.status === "string" ? req.query.status : "";
        const store = sessionStore(req);
        const browserSession = isJournalFilterStatus(status)
          ? recordFilter(store, status)
          : touchJournalSession(store);
        const currentStatus = nextFilterStatus(status, store);

        await this.controller.filterFromHtmx(res, status, browserSession, currentStatus);
      }),
    );

    this.app.use((err: unknown, _req: Request, res: Response, _next: (value?: unknown) => void) => {
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      this.logger.error(message);
      res.status(500).render("entries/partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
    });
  }

  getExpressApp(): express.Express {
    return this.app;
  }
}

export function CreateApp(
  controller: IJournalController,
  authController: IAuthController,
  logger: ILoggingService,
): IApp {
  return new ExpressApp(controller, authController, logger);
}