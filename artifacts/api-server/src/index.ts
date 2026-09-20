import os from "os";
import app from "./app";
import { logger } from "./lib/logger";
import { initPostgresTables } from "@workspace/db";

const port = Number(process.env["PORT"] || 5000);
const host = process.env["HOST"] || "0.0.0.0";

function getLocalIpAddresses(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Initialize PostgreSQL tables if DATABASE_URL is present
initPostgresTables()
  .then(() => {
    app.listen(port, host, () => {
      const localIps = getLocalIpAddresses();
      logger.info({ port, host }, `DRISHTI API Server listening on ${host}:${port}`);
      console.log(`\n======================================================`);
      console.log(` DRISHTI API Server is RUNNING on network port ${port}`);
      console.log(` Local host access:   http://localhost:${port}`);
      localIps.forEach((ip) => {
        console.log(` Network IPv4 access: http://${ip}:${port}`);
      });
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    logger.error(err, "Failed during database table initialization startup");
    app.listen(port, host, () => {
      logger.info({ port, host }, `DRISHTI API Server started with fallback configuration`);
    });
  });
