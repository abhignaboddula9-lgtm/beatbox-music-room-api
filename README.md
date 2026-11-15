# BeatBox Music Room API

BeatBox Music Room is a beginner-friendly REST API for viewing and managing musicians and musical instruments, and viewing instrument loan records. It is built as a BTech Backend Development Fundamentals group assignment.

## Technologies

- Node.js
- Express.js
- SQLite, using the `sqlite` and `sqlite3` packages
- VS Code REST Client extension for manual API requests

## Project structure

```text
music box/
├── server.js
├── database.js
├── package.json
├── music-room.sqlite
├── routes/
│   ├── common.js
│   ├── instruments.js
│   ├── musicians.js
│   └── loans.js
├── test/
│   ├── api.test.js
│   └── instrument-name.test.js
└── api-tests.http
```

The SQLite database file is created when the server initializes the database. `.gitignore` excludes SQLite database files from Git.

## Installation

Open a terminal in the project folder and install the dependencies:

```powershell
npm install
```

## Start the server

Run:

```powershell
npm start
```

The server uses port `3000` by default, so the local API base URL is `http://localhost:3000`. If the `PORT` environment variable is set, the server uses that port instead.

The database file defaults to `music-room.sqlite` in the project folder. `DATABASE_PATH` can be set to use a different SQLite file.

Check that the API is running:

```http
GET http://localhost:3000/
```

The response confirms that the BeatBox Music Room API is running. A separate health check is also available at `GET /health`.

## Database tables and relationships

The database contains three tables:

| Table | Columns |
|---|---|
| `musicians` | `musician_id` (primary key), `name`, `department` |
| `instruments` | `instrument_id` (primary key), `name`, `family` |
| `loans` | `loan_id` (primary key), `musician_id`, `instrument_id`, `loan_date`, `return_date`, `status` |

Each loan references one musician and one instrument. The loan table's `musician_id` and `instrument_id` are foreign keys to the corresponding primary keys. `return_date` may be empty; `status` must be `active` or `returned`.

Instrument names are required and unique without regard to uppercase or lowercase letters. For example, `Guitar 3`, `guitar 3`, and `GUITAR 3` are treated as the same name.

## API endpoints

All API routes use the `/api` prefix. Send JSON bodies with the `Content-Type: application/json` header.

### Instruments

| Method | Endpoint | Description | Expected status |
|---|---|---|---|
| `GET` | `/api/instruments/` | Get all instruments | `200 OK` |
| `GET` | `/api/instruments/:id` | Get one instrument | `200 OK`; `400` for invalid ID; `404` if not found |
| `GET` | `/api/instruments/?family=Strings` | Find instruments whose family exactly matches the query value | `200 OK` |
| `POST` | `/api/instruments/` | Create an instrument | `201 Created`; `400` for invalid or missing fields; `409` for duplicate name |
| `PUT` | `/api/instruments/:id` | Replace an instrument's name and family | `200 OK`; `400` for invalid input; `404` if not found; `409` for duplicate name |
| `DELETE` | `/api/instruments/:id` | Delete an instrument | `204 No Content`; `400` for invalid ID; `404` if not found; `409` if a loan references it |

Create and update requests require both `name` and `family`. Values must be non-empty strings.

Example create request:

```json
{
  "name": "Guitar 3",
  "family": "Strings"
}
```

### Musicians

| Method | Endpoint | Description | Expected status |
|---|---|---|---|
| `GET` | `/api/musicians/` | Get all musicians | `200 OK` |
| `GET` | `/api/musicians/:id` | Get one musician | `200 OK`; `400` for invalid ID; `404` if not found |
| `POST` | `/api/musicians/` | Create a musician | `201 Created`; `400` for invalid or missing fields |
| `PUT` | `/api/musicians/:id` | Replace a musician's name and department | `200 OK`; `400` for invalid or missing fields; `404` if not found |

Create and update requests require non-empty `name` and `department` strings.

Example create request:

```json
{
  "name": "Avery Quinn",
  "department": "Strings"
}
```

There is no musician `DELETE` endpoint.

### Loans

| Method | Endpoint | Description | Expected status |
|---|---|---|---|
| `GET` | `/api/loans/` | Get all loans, including joined musician and instrument names | `200 OK` |
| `GET` | `/api/loans/:id` | Get one loan, including joined musician and instrument names | `200 OK`; `400` for invalid ID; `404` if not found |

A loan response includes `loan_id`, `musician_id`, `musician_name`, `instrument_id`, `instrument_name`, `loan_date`, `return_date`, and `status`. The `musician_name` and `instrument_name` fields come from SQL joins with the musicians and instruments tables.

There is no loan creation, update, return, or delete endpoint in the current API. Loan records can only be viewed through these endpoints.

## Case-insensitive duplicate instrument names

SQLite enforces instrument name uniqueness using `UNIQUE` with `COLLATE NOCASE`. This also protects against duplicate requests arriving close together.

Expected examples:

| Request | Expected result |
|---|---|
| Create `Guitar 3` when it does not exist | `201 Created` |
| Then create `guitar 3` | `409 Conflict` |
| Rename another instrument to `GUITAR 3` | `409 Conflict` |

The API returns a JSON error message for a duplicate name and does not expose the raw SQLite error.

## Test with VS Code REST Client

1. Install or enable the **REST Client** extension in VS Code.
2. Start the server with `npm start`.
3. Open [`api-tests.http`](./api-tests.http) in VS Code.
4. Click **Send Request** above a request to run it.
5. Run the named create requests before requests that reuse their response IDs. For the duplicate-name scenario, run the `Guitar 3` create request first, then the `guitar 3` request, and then the rename-to-`GUITAR 3` request.

The file includes instrument, musician, and loan read requests, valid and invalid examples, and the duplicate-name scenarios. A test musician created through the file remains in the database because the API does not provide a musician delete endpoint. The loan endpoints are read-only, so a joined response with names is available only when loan records already exist.

## Automated tests

Run the automated tests from the project folder:

```powershell
npm test
```

The tests use an in-memory SQLite database and cover API validation, instrument operations, case-insensitive duplicate names, and loan responses with joined musician and instrument names. They do not use or change the project's `music-room.sqlite` data.
