const express = require("express");
const {
  assertBody,
  getId,
  sendNotFound,
  stringField,
} = require("./common");

const router = express.Router();

router.get("/", async (req, res) => {
  const musicians = await req.app.locals.db.all(
    "SELECT musician_id, name, department FROM musicians ORDER BY musician_id"
  );
  res.json(musicians);
});

router.get("/:id", async (req, res) => {
  const musician = await req.app.locals.db.get(
    "SELECT musician_id, name, department FROM musicians WHERE musician_id = ?",
    getId(req)
  );
  if (!musician) return sendNotFound(res, "Musician");
  res.json(musician);
});

router.post("/", async (req, res) => {
  assertBody(req.body);
  const name = stringField(req.body, "name", { required: true });
  const department = stringField(req.body, "department", { required: true });
  const result = await req.app.locals.db.run(
    "INSERT INTO musicians (name, department) VALUES (?, ?)",
    name,
    department
  );
  const musician = await req.app.locals.db.get(
    "SELECT musician_id, name, department FROM musicians WHERE musician_id = ?",
    result.lastID
  );

  res.status(201)
    .location(`/api/musicians/${result.lastID}`)
    .json(musician);
});

router.put("/:id", async (req, res) => {
  assertBody(req.body);
  const id = getId(req);
  const name = stringField(req.body, "name", { required: true });
  const department = stringField(req.body, "department", { required: true });
  const result = await req.app.locals.db.run(
    "UPDATE musicians SET name = ?, department = ? WHERE musician_id = ?",
    name,
    department,
    id
  );
  if (!result.changes) return sendNotFound(res, "Musician");

  const musician = await req.app.locals.db.get(
    "SELECT musician_id, name, department FROM musicians WHERE musician_id = ?",
    id
  );
  res.json(musician);
});

module.exports = router;
