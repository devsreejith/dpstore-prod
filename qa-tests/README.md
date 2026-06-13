# Medusa.js + N-Genius Gateway QA Automation Test Suite

This directory contains a complete, automated QA integration test suite using **Jest** and **Axios** to validate the e-commerce shopping experience, payment flows, security assertions, webhook notifications, inventory controls, and concurrency behavior for a Medusa.js v2 platform integrated with N-Genius Online Payment Gateway.

---

## Folder Structure

```text
qa-tests/
├── config/
│   └── env.ts           # Type-safe environmental variable configuration loader
├── helpers/
│   └── medusa-client.ts # Medusa REST Store API clients and direct PostgreSQL helper queries
├── reports/             # HTML and JSON test result output reports (Git ignored)
├── test-data/
│   └── payloads.ts      # Webhook notification payload mocks (success, failure, cancellation)
├── tests/
│   ├── smoke.test.ts    # Verify basic cart creation, updates, and order generation
│   ├── payment.test.ts  # Test success, decline, and cancellation payment paths
│   ├── webhook.test.ts  # Validate signature validation, duplicate delivery, and delay resilience
│   ├── security.test.ts # Direct success URL checks, currency checks, and request tampering
│   └── inventory.test.ts# Check stock reduction, double-submission locks, and concurrent checkouts
├── .env                 # Environment variables config (copied from .env.example)
├── .env.example         # Environment variables config template
├── jest.config.js       # Jest TS configuration with HTML report config
├── package.json         # Node dependency config and execution scripts
└── tsconfig.json        # TypeScript configuration file
```

---

## Prerequisites

1. **Node.js** version 18 or higher.
2. A running local or UAT Medusa backend server (e.g. listening on port 9000).
3. A running local or UAT PostgreSQL instance with order tables populated.

---

## Installation

1. Navigate to the `qa-tests` directory:
   ```bash
   cd qa-tests
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## Configuration

Configure target server URLs, gateway API keys, and database connections inside the `.env` file (copied from `.env.example`):

```env
# Medusa.js Storefront & Admin Configuration
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_PUBLISHABLE_KEY=pk_bda56acd235b254d9e57ab8a6aed32f5d1ca1ef60d0e42b80c77b6d1df836a9e
MEDUSA_ADMIN_EMAIL=admin@medusajs.com
MEDUSA_ADMIN_PASSWORD=supersecretpassword
MEDUSA_REGION_ID=reg_01KRQXN73JMDE55TZ5N01W6JFZ
MEDUSA_SALES_CHANNEL_ID=sc_01KRQXN6R7EYGC6TKJ144XP9SP

# N-Genius Gateway config
NGENIUS_API_KEY=YTM0MTJkZWUtZWNkMS00MTNkLTlmZTYtZmFlMjM2ZGQ4OGZlOjI3ZDRkNDE1LTI2N2ItNGEwNC1hYzExLTE3NGVmMWYyY2MwNg==
NGENIUS_OUTLET_ID=8a4c97fe-8a50-4784-9e57-b4c4129560f1

# Webhook custom validation keys
NGENIUS_WEBHOOK_HEADER_KEY=DP-NGenius-Secret
NGENIUS_WEBHOOK_HEADER_VALUE=aljaber_dpstore_secret_2026
NGENIUS_WEBHOOK_URL=http://localhost:9000/webhooks/ngenius

# PostgreSQL Database URL
DATABASE_URL=postgresql://medusa:medusa@localhost:5433/dp_store
```

---

## Running Automated Tests

Run target subsets of tests using the custom scripts defined in `package.json`:

* **Smoke Tests**:
  ```bash
  npm run test:smoke
  ```
  Validates baseline storefront functions (add to cart, update quantity, initialize payment session, order completion flow).

* **Payment Flow Tests**:
  ```bash
  npm run test:payment
  ```
  Verifies database states for successful card payments, declines, and customer cancellations.

* **Webhook Integration Tests**:
  ```bash
  npm run test:webhook
  ```
  Tests signature validation, webhook security blocks, idempotency verification, and delayed arrivals.

* **Inventory and Concurrency Tests**:
  ```bash
  npm run test:inventory
  ```
  Checks stock depletion, stock restoration on fails, double-clicking Place Order protection, and race conditions for simultaneous checkouts on a single remaining item.

* **Security Tests**:
  ```bash
  npm run test:security
  ```
  Validates protection against direct success URL hits, payment amount frontend tampering, tax/shipping validations, and unmatched order references.

* **Execute All Tests**:
  ```bash
  npm run test:all
  ```
  Executes all integration tests sequentially in a clean, isolated environment.

---

## Test Reports Output

Upon completing execution, Jest will automatically generate test reports inside the `reports/` folder:

1. **HTML Report**: Open [reports/test-report.html](file:///d:/Dubai-police/qa-tests/reports/test-report.html) in your browser to view a visual summary of test runs, console logs, failure traces, execution durations, and step-level pass rates.
2. **JSON Report**: Available at `reports/test-report.json` for programmatic inspection or deployment triggers.
