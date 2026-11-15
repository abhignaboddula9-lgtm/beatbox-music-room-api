class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function assertBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
}

function stringField(body, field, { required = false, max = 255 } = {}) {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, `${field} is required`);
    }
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }

  const normalized = value.trim();
  if (required && !normalized) {
    throw new HttpError(400, `${field} is required`);
  }
  if (normalized.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }

  return normalized || null;
}

function integerField(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, `${field} must be a positive integer`);
  }
  return parsed;
}

function dateField(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, `${field} is required`);
    }
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${field} must be a valid calendar date`);
  }
  return value;
}

function getId(req) {
  return integerField(req.params.id, "id");
}

function sendNotFound(res, resource) {
  return res.status(404).json({ error: `${resource} not found` });
}

module.exports = {
  HttpError,
  assertBody,
  dateField,
  getId,
  integerField,
  sendNotFound,
  stringField,
};
