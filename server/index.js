import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { createDriveProvider } from "./drive/index.js";
import { createQueue } from "./queue.js";

const provider = createDriveProvider();
const queue = createQueue(provider);

const app = express();
app.use(cors());

// Next unscanned image after the given cursor (-1 to start from the beginning).
app.get("/api/next", (req, res) => {
  const cursor = Number.parseInt(req.query.cursor, 10);
  res.json(queue.next(Number.isNaN(cursor) ? -1 : cursor));
});

// Current config the screen needs (theme, weights, provider).
app.get("/api/config", (_req, res) => {
  res.json({
    theme: config.theme,
    weights: config.weights,
    provider: provider.name,
    animationMs: 10_000,
  });
});

// Image proxy — only meaningful for the google provider. Streams bytes so the
// service-account credentials never reach the browser.
app.get("/api/image/:id", async (req, res) => {
  try {
    const { mimeType, stream } = await provider.stream(req.params.id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    stream.pipe(res);
  } catch (err) {
    console.error(`[image] ${req.params.id}:`, err.message);
    res.status(502).json({ error: "failed to fetch image" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

queue.start();

app.listen(config.port, () => {
  console.log(`[server] http://localhost:${config.port}  provider=${provider.name}  theme="${config.theme}"`);
});
