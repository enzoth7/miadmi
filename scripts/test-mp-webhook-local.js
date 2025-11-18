#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

const secret = process.env.MP_WEBHOOK_SECRET || "test-secret";
const ts =
  process.env.MP_WEBHOOK_TEST_TS || Math.floor(Date.now() / 1000).toString();
const requestId = process.env.MP_WEBHOOK_TEST_REQUEST_ID || "test-request-1";
const eventId = process.env.MP_WEBHOOK_TEST_EVENT_ID || "123456789";
const baseUrl = process.env.MP_WEBHOOK_TEST_URL || "http://localhost:3000";
const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/mp/webhook?id=${encodeURIComponent(eventId)}`;

const manifest = `id:${eventId};request-id:${requestId};ts:${ts};`;
const signature = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

const payload = JSON.stringify(
  {
    type: "preapproval",
    data: { id: eventId },
    test: true,
  },
  null,
  2
);

console.log("[mp-webhook:test] POST", webhookUrl);
console.log("[mp-webhook:test] manifest", manifest);
console.log("[mp-webhook:test] signature", signature);

const curlArgs = [
  "-i",
  "-X",
  "POST",
  webhookUrl,
  "-H",
  "Content-Type: application/json",
  "-H",
  "X-MP-DryRun: 1",
  "-H",
  `x-request-id: ${requestId}`,
  "-H",
  `x-signature: ts=${ts},v1=${signature}`,
  "--data",
  payload,
];

const result = spawnSync("curl", curlArgs, { stdio: "inherit" });

if (result.error) {
  console.error("[mp-webhook:test] curl failed", result.error.message);
  process.exitCode = 1;
} else if (result.status !== 0) {
  console.error("[mp-webhook:test] curl exited with code", result.status);
  process.exitCode = result.status ?? 1;
}
