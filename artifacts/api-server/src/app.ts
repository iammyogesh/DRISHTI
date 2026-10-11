import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Dynamic CORS configuration allowing LAN & local network connections
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "15mb" }));
// Health check and root ping endpoints for Render & cron-job.org
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "DRISHTI API Server",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

app.use("/api", router);

// Centralized error handling middleware masking internal stack traces
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err, "Unhandled application error caught");

  const status = typeof err.status === "number" ? err.status : 500;
  const message =
    status === 500
      ? "An unexpected system error occurred while processing your request. Please try again later."
      : err.message || "An error occurred.";

  return res.status(status).json({ error: message });
});

export default app;
