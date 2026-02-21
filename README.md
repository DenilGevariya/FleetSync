# 📦 FleetFlow — Fleet Management System

FleetFlow is a full-stack fleet management platform designed to manage vehicles, drivers, trips, fuel, and maintenance operations with role-based access control and real-time operational tracking.

It enables logistics teams to coordinate fleet operations efficiently while maintaining historical records and compliance data.

---

# 🚀 Features

## 👥 Authentication & Roles
- JWT-based authentication  
- Secure password hashing (bcrypt)  
- Role-based access:  
  - MANAGER  
  - DISPATCHER  
  - SAFETY  
  - FINANCE  

---

## 🚚 Fleet Management
- Vehicle registry  
- Capacity & plate tracking  
- Vehicle status lifecycle:  
  - AVAILABLE  
  - ON_TRIP  
  - IN_SHOP  
  - RETIRED  

---

## 🧑‍✈️ Driver Management
- License tracking & expiry alerts  
- Status control (AVAILABLE / SUSPENDED)  
- Assignment to trips  
- Compliance monitoring  

---

## 🗺 Trip Management
- Create & dispatch trips  
- Capacity validation  
- Driver license validation  
- Trip lifecycle:  
  - DRAFT  
  - DISPATCHED  
  - COMPLETED  
  - CANCELLED  
- Auto vehicle/driver status sync  

---

## 🛠 Maintenance Tracking
- Service logs per vehicle  
- Auto vehicle → IN_SHOP  
- Release vehicle back to AVAILABLE  
- Cost tracking  

---

## ⛽ Fuel Logs
- Fuel entries per vehicle  
- Cost tracking  
- Per-liter calculation  
- Fleet fuel analytics  

---

## 📊 Analytics Dashboard
- Fleet utilization  
- Driver availability  
- Trip statistics  
- Fuel & maintenance cost summary  
- Monthly expense reports  

---

# 🏗 Tech Stack

## Frontend
- React (Vite)
- TailwindCSS
- React Router
- Context API (Auth + Toast)
- Axios

## Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt password hashing

## Database
- PostgreSQL (local or Render)
- Relational schema with FK constraints

---

# 🗄 Database Schema

Core tables:

- users  
- vehicles  
- drivers  
- trips  
- maintenance_logs  
- fuel_logs  

Relationships:

- trips.driver_id → drivers.id (ON DELETE SET NULL)  
- trips.vehicle_id → vehicles.id (ON DELETE SET NULL)  
- maintenance_logs.vehicle_id → vehicles.id  
- fuel_logs.vehicle_id → vehicles.id  

---

# 🔐 Roles & Permissions

| Role | Permissions |
|------|------------|
MANAGER | Full access |
DISPATCHER | Trips, vehicles, drivers |
SAFETY | Drivers |
FINANCE | Fuel & maintenance |
DRIVER | View assigned trips |



# 🖥 Local Setup

## 1️⃣ Clone repository

```bash
git clone https://github.com/yourusername/fleetflow.git
cd fleetflow

Backend Setup
cd Backend
npm install
npm run dev

Backend Setup
cd Backend
npm install
npm run dev

App runs:

http://localhost:3000
```
