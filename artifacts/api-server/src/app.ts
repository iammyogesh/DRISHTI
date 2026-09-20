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
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

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
