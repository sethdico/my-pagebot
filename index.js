const express = require("express");
const path = require("path");
const fs = require("fs-extra"); // Replaced fs for async ops
const app = express();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");

// --- 🧹 STARTUP CLEANER (Async) ---
(async () => {
  if (!(await fs.pathExists(cacheDir))) {
    await fs.mkdirp(cacheDir);
  } else {
    const files = await fs.readdir(cacheDir);
    for (const file of files) {
      try { await fs.unlink(path.join(cacheDir, file)); } catch(e) { console.error("Cache cleanup error:", e); }
    }
    console.log("🧹 SYSTEM: Cache cleared on startup.");
  }
})();

// Middleware
app.use(express.json({ limit: '10mb' })); // Built-in JSON parser with size limit
app.use(express.static("website"));

// Force HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

app.get("/", (req, res) => { require("./website/web.js").html(res); });
app.get("/webhook", (req, res) => { require("./website/web.js").verify(req, res); });
app.post("/webhook", (req, res) => {
  require("./webhook.js").listen(req.body);
  res.sendStatus(200);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).send("Internal Server Error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  require("./website/web.js").log();
});
