import "@/lib/load-env";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { createApp } from "@/app";

const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error("PORT is not set — add it to the .env file at the repo root.");
}

const app = createApp();

// HTTPS straight from Node when a certificate is configured (e.g. Let's Encrypt for the duckdns
// hostname); otherwise plain HTTP, for local runs or behind a TLS-terminating reverse proxy.
const certPath = process.env.SSL_CERT_PATH?.trim();
const keyPath = process.env.SSL_KEY_PATH?.trim();
const server =
  certPath && keyPath
    ? https.createServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, app)
    : http.createServer(app);

server.listen(PORT, () => {
  console.log(`Backend listening on ${certPath && keyPath ? "https" : "http"}://localhost:${PORT}`);
});
