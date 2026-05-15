# WarranTech Project Context

## Overview
WarranTech is a comprehensive warranty and supply chain management system designed to track products from manufacturing to the end customer. It facilitates sales registration, QR code-based product tracking, and manages service/replacement requests through a multi-role architecture.

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with `bcryptjs` for password hashing
- **File Handling:** `multer` for image/PDF uploads
- **Tools:** `pdfkit` (PDF generation), `qrcode` (QR code generation), `dotenv` (environment variables)

### Frontend
- **Framework:** React (v19)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4)
- **State Management:** React Context API (AuthContext)
- **Routing:** React Router DOM (v7)
- **Visualization:** Recharts (Dashboards)
- **Icons:** Lucide React
- **Tools:** `qr-scanner` (QR scanning), `jspdf` (PDF generation), `react-hot-toast` (Notifications)

## Role-Based Access Control (RBAC)
The system supports several distinct roles, each with specific views and permissions:

1.  **Admin:** Full system oversight. Manages users, roles, categories, models, and has access to all dashboards.
2.  **Factory:** Manages production orders, inventory, and sales to distributors.
3.  **Distributor:** Handles inventory from factories, sales to dealers, and direct customer sales.
4.  **Dealer:** Manages local inventory and registers sales to final customers via QR scanning.
5.  **Technician:** Assigned to service requests. Performs diagnosis, records repairs, and handles replacement outcomes.
6.  **Customer:** Registers products, views purchase history, and submits warranty/service requests.

## Key Data Models

- **User:** Core authentication model. Stores credentials, role, and references to associated entities (Factory/Distributor/Dealer).
- **Product:** Tracks individual units via unique serial numbers. Stores status (Active, Sold, Replacement Requested), category, model, and current owner (Factory/Distributor/Dealer).
- **Sale:** Records the transfer of ownership to a customer, including customer details and associated plumber/technician info.
- **ReplacementRequest:** Acts as a service ticket. Tracks complaint descriptions, media uploads, technician assignments, diagnosis notes, and resolution status (Repaired/Replacement Required).
- **Order:** Manages bulk product movements between supply chain tiers.

## Core Workflows

1.  **Inventory Flow:** Factory -> Distributor -> Dealer. Each step involves updating the `Product`'s owner reference.
2.  **Sales Registration:** Dealers use the `SellQRScannerModal` to scan product serials and register customer details, creating a `Sale` record and marking the `Product` as sold.
3.  **Service Request:** Customers raise a request via the `CustomerDashboard`. A `ReplacementRequest` is created.
4.  **Service Resolution:** Admins/Managers assign a `Technician`. The technician updates the request with diagnosis notes and before/after images.

## Project Structure

### Backend (`/backend`)
- `app.js`: Main entry point.
- `models/`: Mongoose schemas defining the data structure.
- `controllers/`: Business logic for each route.
- `routes/`: API endpoint definitions.
- `middleware/`: Authentication and role verification logic.
- `scripts/`: Maintenance scripts (e.g., expiring warranties, database seeding).

### Frontend (`/frontend`)
- `src/App.jsx`: Main routing logic.
- `src/components/pages/`: Role-specific dashboards and management views.
- `src/components/global/`: Shared UI components (Layouts, Modals, Scanners).
- `src/context/`: Auth state and permission management.
- `src/services/`: Frontend API service layers.
