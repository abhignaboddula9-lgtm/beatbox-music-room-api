const express = require("express");
const { initializeDatabase } = require("./database");
const musiciansRouter = require("./routes/musicians");
const instrumentsRouter = require("./routes/instruments");
const loansRouter = require("./routes/loans");
const { HttpError } = require("./routes/common");

function createApp(db) {
  const app = express();
  app.locals.db = db;

  app.use(express.json({ limit: "100kb" }));
  app.get("/", (req, res) => {
    res.json({ message: "BeatBox Music Room API is running" });
  });
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/musicians", musiciansRouter);
  app.use("/api/instruments", instrumentsRouter);
  app.use("/api/loans", loansRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError || Number.isInteger(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code && error.code.startsWith("SQLITE_CONSTRAINT")) {
      if (error.message.includes("UNIQUE constraint failed: instruments.name")) {
        return res.status(409).json({
          error: "An instrument with this name already exists",
        });
      }
      if (error.message.includes("FOREIGN KEY constraint failed")) {
        return res.status(409).json({
          error: "This record is referenced by another record and cannot be changed or deleted",
        });
      }
      return res.status(409).json({
        error: "The request conflicts with existing data",
      });
    }
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body contains invalid JSON" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

async function startServer() {
  const db = await initializeDatabase();
  const app = createApp(db);
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`Beatbox Music Room API listening on port ${server.address().port}`);
  });
  server.on("close", () => {
    db.close().catch((error) => console.error("Failed to close database:", error));
  });
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start Beatbox Music Room API:", error);
    process.exitCode = 1;
  });
}

module.exports = { createApp, startServer };
