# Scenarios Prototype

A micro-frontend UI module for an investment bank's risk platform, featuring scenario management with workflow-driven review and approval processes.

## Architecture

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | React 19, TypeScript, Webpack 5, Fluent UI v9, Redux Toolkit + Redux-Saga | 3000 |
| Backend | Java 21, Spring Boot 3.4.13, Spring Data JPA, Liquibase | 9090 |
| Database | PostgreSQL 15 | 5433 |

## Prerequisites

- **Java 21** (JDK)
- **Maven 3.9+**
- **Node.js 20+** and **npm 9.6+**
- **Docker Desktop** (for PostgreSQL) — or a local PostgreSQL 15 installation

## Running Locally (No Docker for app services)

The only Docker dependency is the PostgreSQL database. The backend and frontend both run natively on your machine.

### Step 1: Start PostgreSQL (Docker)

From the `model-logic-service/` directory:

```bash
cd model-logic-service
docker compose up -d
```

This starts a PostgreSQL 15 container on **port 5433** with:
- Database: `scenarios`
- Username: `scenarios`
- Password: `scenarios`

> **Alternative (no Docker at all):** If you have a local PostgreSQL 15 installation, create a database called `scenarios` with user `scenarios`/password `scenarios`, and ensure it's accessible on `localhost:5433`. Or update `model-logic-service/src/main/resources/application.properties` to match your local setup.

### Step 2: Start the Backend

From the `model-logic-service/` directory:

```bash
cd model-logic-service
mvn spring-boot:run
```

This will:
1. Compile the Java 21 application
2. Run all 22 Liquibase changesets to create/seed the database schema
3. Start the Spring Boot server on **http://localhost:9090**

Verify it's running:
```bash
curl http://localhost:9090/actuator/health
```

### Step 3: Start the Frontend

From the `frontend/` directory:

```bash
cd frontend
npm install      # first time only
npm run dev
```

This starts the Webpack dev server on **http://localhost:3000** with hot-reload enabled.

The frontend reads `REACT_APP_API_BASE_URL` from `.env` (defaults to `http://localhost:9090`).

Open your browser at **http://localhost:3000**.

### Full Startup (one terminal per service)

```bash
# Terminal 1 — Database
cd model-logic-service && docker compose up -d

# Terminal 2 — Backend
cd model-logic-service && mvn spring-boot:run

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
```

## Running Tests

### Backend Tests

Backend tests use an in-memory H2 database (PostgreSQL compatibility mode) — no running PostgreSQL instance required.

```bash
cd model-logic-service
mvn test
```

### Frontend Tests

```bash
cd frontend
npx jest --no-coverage
```

Or with watch mode:
```bash
cd frontend
npm run test:watch
```

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scenarios` | List all scenarios |
| GET | `/scenarios/{id}?expand=header,summaryCards,reviewApproval,directChanges,impactData` | Scenario detail (section-based expand) |
| POST | `/scenarios/{id}/messages` | Post a message (requires `X-Actor-Id` header) |
| POST | `/scenarios/{id}/events` | Post an event (requires `X-Actor-Id` or `X-Actor: System` header) |
| GET | `/admin/signoff-policies` | List signoff policies (optional `?scenarioTypeCode=` filter) |
| POST | `/admin/signoff-policies` | Create a signoff policy |
| PUT | `/admin/signoff-policies/{id}` | Update a signoff policy |

## Frontend Routes

| Route | Page |
|-------|------|
| `/` | Scenarios list |
| `/scenarios/:id` | Scenario detail pane |
| `/admin/signoff-policies` | Admin: Signoff policy management |

## Project Structure

```
Scenarios/
├── model-logic-service/          # Spring Boot backend
│   ├── src/main/java/            # Java source (entities, DTOs, controllers, services)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/changelog/         # Liquibase changesets (001-022)
│   ├── src/test/                  # JUnit 5 tests (H2 in-memory)
│   ├── docker-compose.yml         # PostgreSQL container
│   └── pom.xml
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── pages/                 # Page-level components
│   │   ├── routes/                # React Router configuration
│   │   ├── store/                 # Redux slices, sagas, store
│   │   └── services/              # API service layer (axios)
│   ├── .env                       # API base URL config
│   ├── webpack.config.js
│   └── package.json
└── agent-os/                      # Spec/task management (development artifacts)
    └── specs/                     # Increment specs and task breakdowns
```

## Configuration

### Backend (`application.properties`)

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `9090` | Backend server port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5433/scenarios` | Database connection URL |
| `spring.datasource.username` | `scenarios` | Database username |
| `spring.datasource.password` | `scenarios` | Database password |

### Frontend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:9090` | Backend API base URL |
