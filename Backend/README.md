# FleetFlow — Fleet & Logistics Management System (Backend)

> Production-ready REST API for managing delivery fleets, driver compliance, maintenance, fuel, and financial analytics.

---

## Tech Stack
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL (via `pg`)
- **Auth**: JWT + bcrypt
- **Architecture**: MVC with Controller/Service separation
- **Validation**: express-validator

---

## Project Structure

```
fleetflow/
├── src/
│   ├── app.js                    # Express entry point
│   ├── db/
│   │   ├── connection.js         # pg Pool
│   │   ├── schema.sql            # Full DB schema + seed
│   │   └── init.js               # DB initializer script
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verify + RBAC
│   │   └── errorHandler.js       # Global error & validation handler
│   ├── services/                 # Business logic layer
│   │   ├── authService.js
│   │   ├── vehicleService.js
│   │   ├── driverService.js
│   │   ├── tripService.js
│   │   ├── maintenanceService.js
│   │   ├── fuelService.js
│   │   └── analyticsService.js
│   ├── controllers/              # Request/Response layer
│   │   ├── authController.js
│   │   ├── vehicleController.js
│   │   ├── driverController.js
│   │   ├── tripController.js
│   │   ├── maintenanceController.js
│   │   ├── fuelController.js
│   │   └── analyticsController.js
│   └── routes/                   # Express routers
│       ├── authRoutes.js
│       ├── vehicleRoutes.js
│       ├── driverRoutes.js
│       ├── tripRoutes.js
│       ├── maintenanceRoutes.js
│       ├── fuelRoutes.js
│       └── analyticsRoutes.js
├── .env.example
├── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### 4. Create database and run schema
```bash
# Create database in psql
createdb fleetflow

# Initialize schema and seed admin user
npm run db:init
```

### 5. Start server
```bash
npm run dev        # Development with nodemon
npm start          # Production
```

Server starts at `http://localhost:5000`

---

## Default Admin Credentials
```
Email:    admin@fleetflow.io
Password: Admin@1234
Role:     MANAGER
```

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login and get JWT |
| GET | `/auth/me` | All | Get current user |
| GET | `/auth/users` | MANAGER | List all users |
| PATCH | `/auth/users/:id/toggle` | MANAGER | Activate/deactivate user |

**Register body:**
```json
{
  "name": "John Fleet",
  "email": "john@fleet.io",
  "password": "secret123",
  "role": "DISPATCHER"
}
```

**Roles:** `MANAGER` | `DISPATCHER` | `SAFETY` | `FINANCE`

---

### Vehicle Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/vehicles` | All | List vehicles (filter: status, vehicle_type, region) |
| GET | `/vehicles/:id` | All | Vehicle detail + cost totals |
| POST | `/vehicles` | MANAGER | Create vehicle |
| PUT | `/vehicles/:id` | MANAGER | Update vehicle |
| PATCH | `/vehicles/:id/status` | MANAGER | Set status (AVAILABLE/IN_SHOP/RETIRED) |
| DELETE | `/vehicles/:id` | MANAGER | Delete vehicle |

**Vehicle statuses:** `AVAILABLE` → `ON_TRIP` (auto) → `AVAILABLE` (auto) | `IN_SHOP` (auto) | `RETIRED`

**Create body:**
```json
{
  "name": "Van-05",
  "model": "Ford Transit 2023",
  "license_plate": "GR-1234-AB",
  "vehicle_type": "VAN",
  "max_capacity_kg": 500,
  "odometer_km": 12000,
  "acquisition_cost": 45000,
  "region": "North"
}
```

---

### Driver Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/drivers` | All | List drivers (filter: status, license_category) |
| GET | `/drivers/:id` | All | Driver detail + license_expired flag |
| POST | `/drivers` | MANAGER, SAFETY | Create driver |
| PUT | `/drivers/:id` | MANAGER, SAFETY | Update driver |
| PATCH | `/drivers/:id/status` | MANAGER, SAFETY | Set status (ON_DUTY/OFF_DUTY/SUSPENDED) |
| DELETE | `/drivers/:id` | MANAGER | Delete driver |

**Create body:**
```json
{
  "name": "Alex Rider",
  "employee_id": "EMP-001",
  "phone": "+1234567890",
  "email": "alex@fleet.io",
  "license_number": "DL-98765",
  "license_category": "VAN",
  "license_expiry": "2026-12-31",
  "safety_score": 95
}
```

---

### Trip Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/trips` | All | List trips (filter: status, vehicle_id, driver_id) |
| GET | `/trips/:id` | All | Trip detail + fuel cost |
| POST | `/trips` | MANAGER, DISPATCHER | Create trip (DRAFT) |
| POST | `/trips/:id/dispatch` | MANAGER, DISPATCHER | Dispatch → sets vehicle & driver ON_TRIP |
| POST | `/trips/:id/complete` | MANAGER, DISPATCHER | Complete → sets vehicle & driver AVAILABLE |
| POST | `/trips/:id/cancel` | MANAGER, DISPATCHER | Cancel trip |

**Business Rules enforced:**
- `cargo_weight_kg ≤ vehicle.max_capacity_kg` (422 if violated)
- Vehicle must be `AVAILABLE` (409 if not)
- Driver must not be `SUSPENDED` or `ON_TRIP` (409)
- Driver license must not be expired (422)
- All checks use `SELECT ... FOR UPDATE` to prevent race conditions

**Create body:**
```json
{
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "origin": "Warehouse A, Ahmedabad",
  "destination": "Store 12, Surat",
  "cargo_description": "Electronics",
  "cargo_weight_kg": 450,
  "scheduled_at": "2026-02-22T08:00:00Z"
}
```

**Dispatch body:**
```json
{ "start_odometer": 12000 }
```

**Complete body:**
```json
{ "end_odometer": 12350, "notes": "Delivered on time." }
```

---

### Maintenance Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/maintenance` | All | List logs (filter: vehicle_id, resolved=true/false) |
| GET | `/maintenance/:id` | All | Log detail |
| POST | `/maintenance` | MANAGER | Create log → AUTO sets vehicle IN_SHOP |
| PUT | `/maintenance/:id` | MANAGER | Update log details |
| POST | `/maintenance/:id/resolve` | MANAGER | Resolve → vehicle returns AVAILABLE |

**Auto-Logic:** Creating a maintenance log automatically sets vehicle status to `IN_SHOP`, removing it from dispatcher pool. Resolving the last open log returns the vehicle to `AVAILABLE`.

**Create body:**
```json
{
  "vehicle_id": "uuid",
  "service_type": "Oil Change",
  "description": "Full synthetic oil change + filter",
  "cost": 150.00,
  "service_date": "2026-02-21",
  "vendor": "AutoCare Center",
  "odometer_at_service": 12350
}
```

---

### Fuel Log Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/fuel` | All | List logs (filter: vehicle_id, trip_id) |
| GET | `/fuel/:id` | All | Log detail |
| POST | `/fuel` | MANAGER, DISPATCHER, FINANCE | Create fuel log |
| DELETE | `/fuel/:id` | MANAGER, FINANCE | Delete log |

**Create body:**
```json
{
  "vehicle_id": "uuid",
  "trip_id": "uuid (optional)",
  "liters": 45.5,
  "cost_per_liter": 1.32,
  "odometer_at_fill": 12200,
  "fuel_date": "2026-02-21",
  "station": "BP Station North"
}
```

---

### Analytics Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/analytics/dashboard` | All | Fleet KPIs + utilization snapshot |
| GET | `/analytics/fuel-efficiency` | MANAGER, FINANCE | km/L per vehicle |
| GET | `/analytics/cost-per-km` | MANAGER, FINANCE | Operational cost per km |
| GET | `/analytics/vehicle-roi` | MANAGER, FINANCE | Acquisition cost vs. operational spend |
| GET | `/analytics/utilization` | MANAGER, FINANCE, DISPATCHER | Monthly trip & cargo stats |
| GET | `/analytics/driver-performance` | MANAGER, SAFETY | Safety scores, trip counts |
| GET | `/analytics/financial-summary` | MANAGER, FINANCE | Monthly fuel + maintenance costs |

**Query params:**
- `vehicle_id` (UUID) — filter to a specific vehicle
- `year` (int) — for `/financial-summary` (default: current year)

---

## Business Logic Summary

```
Vehicle Intake   → status: AVAILABLE
Trip Created     → status: DRAFT (validations run)
Trip Dispatched  → Vehicle: ON_TRIP, Driver: ON_TRIP
Trip Completed   → Vehicle: AVAILABLE, Driver: ON_DUTY, odometer updated
Trip Cancelled   → Vehicle: AVAILABLE (if was dispatched), Driver: ON_DUTY
Maintenance Log  → Vehicle: IN_SHOP (removed from dispatcher pool)
Maintenance Resolved → Vehicle: AVAILABLE (if no other open logs)
```

---

## Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message.",
  "errors": [{ "field": "cargo_weight_kg", "message": "must be positive" }]
}
```

## Success Response Format
```json
{
  "success": true,
  "message": "Optional description.",
  "count": 5,
  "data": { ... }
}
```
