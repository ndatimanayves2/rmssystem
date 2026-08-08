# Smart Government Medical Supply Chain UI Mockups Plan

## 1. Overview
This document captures the UI mockup plan for the Smart Government Medical Supply Chain Management System. It is structured like a Final Year Project documentation package, with UI sections, wireframes, component mapping, data flow, API endpoints, database tables, and error-handling guidance.

## 2. Current Project Context
The workspace includes:
- `backend/` — Node.js + Express API with role-based auth and PostgreSQL queries
- `frontend/` — React app with router, shared layout, auth context, pages, and reusable UI components
- `database/` — schema and seed data support
- `ai-module/` — Python forecasting microservice

The frontend currently supports multiple user roles and shared pages like `Dashboard`, `Inventory`, `Requests`, `PurchaseOrders`, `Deliveries`, `Reports`, `Forecast`, `Users`, `GISMap`, `QRScanner`, and `Profile`.

## 3. Documentation Goals
Deliver the following as part of the UI mockup plan:
- Section-based page list for all portals
- Per-page wireframes and layout ideas
- Component inventory
- Buttons, tables, charts, and responsive design notes
- Primary API endpoint mapping
- Database tables used by each page
- Error handling and user experience guidance

---

## 4. Section 1: Authentication (4 Pages)
### 4.1 Login
Wireframe:
```
+--------------------------------------------------+
| LOGO  | Email [_________] | Password [______]     |
|        [Remember me] [Login] [Forgot password]    |
|        [Use OTP] [Sign in with SSO]              |
+--------------------------------------------------+
| Status message / validation errors               |
+--------------------------------------------------+
```
UI Layout:
- Centered auth card
- Email and password fields
- Primary action button `Login`
- Secondary link `Forgot Password`
- Optional `OTP Login` trigger

Components:
- Input field
- Password visibility toggle
- Checkbox
- Button
- Alert message
- Link

Buttons:
- `Login`
- `Forgot Password`
- `Use OTP`

API Endpoints:
- POST `/api/auth/login`
- POST `/api/auth/verify-2fa`

Database Tables:
- `users`
- `roles`
- `user_2fa` or equivalent 2FA state (existing auth controllers imply 2FA support)

Functionalities:
- Validate required email/password
- Display inline and toast error messages
- Handle 401 Unauthorized and invalid credentials
- If 2FA enabled for user, prompt OTP after initial login

### 4.2 Forgot Password
Wireframe:
```
+------------------------------------------+
| Email [____________________________]     |
| [Send reset link]                        |
| Message: "Check your email for instructions" |
+------------------------------------------+
```
UI Layout:
- Single column form
- Confirmation message after submit

Components:
- Input field
- Button
- Success message

Buttons:
- `Send reset link`

API Endpoints:
- (Not currently implemented; frontend plan should expect `/api/auth/forgot-password`)

Database Tables:
- `password_resets` or token store

Functionalities:
- Email validation
- Show success after request
- Handle network and server errors

### 4.3 Reset Password
Wireframe:
```
+-----------------------------------------+
| New password [_________]                |
| Confirm password [_________]            |
| [Reset Password]                        |
| Status / validation errors              |
+-----------------------------------------+
```

UI Layout:
- Form with password fields
- Confirmation and strength hints

Components:
- Password input
- Button
- Validation errors

Buttons:
- `Reset Password`

API Endpoints:
- (Expected: POST `/api/auth/reset-password`)

Database Tables:
- `password_resets`

Functionalities:
- Password match validation
- Strength indicator
- Error handling for expired tokens

### 4.4 Two-Factor Authentication (OTP)
Wireframe:
```
+-----------------------------------------+
| Enter OTP [____] [____] [____] [____]   |
| [Verify] [Resend OTP]                   |
| Message: OTP sent to email/phone        |
+-----------------------------------------+
```

UI Layout:
- OTP code entry
- Countdown timer / resend link

Components:
- OTP input
- Button
- Timer
- Inline status

Buttons:
- `Verify`
- `Resend OTP`

API Endpoints:
- POST `/api/auth/verify-2fa`
- POST `/api/auth/setup-2fa`
- POST `/api/auth/enable-2fa`
- POST `/api/auth/disable-2fa`

Database Tables:
- `users`
- `user_2fa`

Functionalities:
- Validate OTP format
- Show error on invalid code
- Display resend cooldown

---

## 5. Section 2: Ministry of Health Admin (10 Pages)
This portal is the most feature-rich. It must support MOH admin workflows for monitoring medicine flow, facility needs, procurement, and oversight.

### 5.1 Dashboard
Wireframe:
```
+------------------------------------------------------------+
| LOGO | Search ________ | 🔔 | 🌙 | 👤 Admin              |
+------------------------------------------------------------+
| Sidebar      | +--------------+ +--------------+ +--------+|
|              | | Total Meds   | | Low Stock    | | PO     ||
|              | +--------------+ +--------------+ +--------+|
|              | +--------------+ +--------------+ +--------+|
|              | | Active Deliv | | Pending Req  | | Users  ||
|              | +--------------+ +--------------+ +--------+|
|              |                                                |
|              | 📈 Monthly Distribution Chart                |
|              |                                                |
|              | 🗺 Live Rwanda Map (warehouses, hospitals)    |
|              |                                                |
|              | 📋 Recent Requests Table                     |
+------------------------------------------------------------+
```
UI Layout:
- Header with search, notifications, profile
- Sidebar menu
- KPI cards grid
- chart panels and map panel
- recent requests / orders table

Components:
- Sidebar navigation
- Stat cards
- Line/bar chart
- Map placeholder
- Responsive table
- Search input

Buttons:
- `View details`
- `Export CSV/PDF`
- `Create request`
- `Filter`

API Endpoints:
- GET `/api/dashboard/stats`
- GET `/api/requests`
- GET `/api/facilities`
- GET `/api/medicines`
- GET `/api/deliveries`
- GET `/api/reports/facilities-map`
- GET `/api/notifications`

Database Tables:
- `medicines`
- `stock_batches`
- `medicine_requests`
- `deliveries`
- `purchase_orders`
- `facilities`
- `users`
- `notifications`
- `districts`, `provinces`

Functionalities:
- Load KPI data and tables
- Chart filters by date or facility type
- Map overlays for warehouses/hospitals/vehicles
- Notification preview
- Error fallback for map or dashboard loads

### 5.2 Medicines
Wireframe:
```
+------------------------------------------------------------+
| Search [________] [Add Medicine] [Export]                  |
+------------------------------------------------------------+
| +--------------------------------------------------------+ |
| | Table: Medicine | Category | Unit Price | Stock | Reorder | |
| +--------------------------------------------------------+ |
| | Row actions: Edit | Deactivate | View Batch History |    |
+------------------------------------------------------------+
```
UI Layout:
- Top actions bar
- paginated table
- modal form to add/edit medicine
- filters by category and stock status

Components:
- Data table
- Button group
- Modal dialog
- Dropdown filters
- Search bar

Buttons:
- `Add Medicine`
- `Edit`
- `Deactivate`
- `View batch history`

API Endpoints:
- GET `/api/medicines`
- POST `/api/medicines`
- GET `/api/inventory/batches`
- GET `/api/inventory/low-stock`

Database Tables:
- `medicines`
- `medicine_categories`
- `stock_batches`

Functionalities:
- Show validation errors in forms
- Handle empty table states
- Display server error alert
- Confirm deactivation actions

### 5.3 Suppliers
Wireframe:
```
+-----------------------------------------------------+
| [Add Supplier] [Export]                             |
| Table: Supplier | Contact | Rating | Status | Actions|
+-----------------------------------------------------+
```
UI Layout:
- Supplier directory table
- quick access to performance metrics
- supplier detail drawer or modal

Components:
- Table
- Badge/status chips
- Drawer/modal
- Search/filter fields

Buttons:
- `Add Supplier`
- `View performance`
- `Toggle active`

API Endpoints:
- GET `/api/suppliers` (not currently in backend routes; plan extension)
- POST `/api/suppliers`
- PUT `/api/suppliers/:id`
- GET `/api/purchase-orders/supplier-performance`

Database Tables:
- `suppliers`
- `supplier_performance`
- `purchase_orders`

Functionalities:
- Show supplier rating and delivery timeliness
- Manage active / inactive suppliers
- Handle missing supplier data gracefully

### 5.4 Warehouses
Wireframe:
```
+-----------------------------------------------------+
| [Add Warehouse] [Map View]                          |
| Table: Warehouse | Location | Manager | Capacity |  |
+-----------------------------------------------------+
```
UI Layout:
- Warehouse list with location and capacity details
- map / cards for warehouse summary

Components:
- Table
- Map view toggle
- Stats cards

Buttons:
- `Add Warehouse`
- `View inventory`
- `Edit`

API Endpoints:
- GET `/api/warehouses` (expected extension)
- POST `/api/warehouses`
- GET `/api/inventory`

Database Tables:
- `warehouses`
- `stock_batches`
- `facilities` if warehouses are stored as facilities

Functionalities:
- Filter by region or manager
- Show warehouse stock alerts
- Handle no warehouse records

### 5.5 Health Facilities
Wireframe:
```
+-----------------------------------------------------+
| Search facility [____] [Filter type] [Add Facility]  |
| Table: Facility | Type | District | Stock Status |  |
+-----------------------------------------------------+
```
UI Layout:
- facility list with type filter
- facility summary cards
- facility detail modal

Components:
- Table
- Filter chips
- Detail drawer

Buttons:
- `Add Facility`
- `View requests`
- `Edit`

API Endpoints:
- GET `/api/facilities`
- POST `/api/facilities`

Database Tables:
- `facilities`
- `districts`
- `provinces`

Functionalities:
- Search by facility name or district
- Show facility status and contact
- Manage error states

### 5.6 Medicine Requests
Wireframe:
```
+----------------------------------------------------------+
| [New Request] [Filter pending/approved/rejected]          |
| Table: Req # | Facility | Medicine | Qty | Priority | Action|
+----------------------------------------------------------+
```
UI Layout:
- requests table with status filters
- row actions to approve/reject
- new request button

Components:
- Table
- Action buttons
- Status badges
- Modal form

Buttons:
- `New Request`
- `Approve`
- `Reject`
- `View details`

API Endpoints:
- GET `/api/requests`
- POST `/api/requests`
- PUT `/api/requests/:id/approve`
- PUT `/api/requests/:id/reject`

Database Tables:
- `medicine_requests`
- `facilities`
- `users`

Functionalities:
- Approve/reject with confirmation
- Error handling for invalid IDs
- Pagination and filter state retention

### 5.7 Purchase Orders
Wireframe:
```
+--------------------------------------------------------+
| [Create PO] [Filter status] [Export report]            |
| Table: PO # | Supplier | Warehouse | Total | Status |  |
+--------------------------------------------------------+
```
UI Layout:
- PO management table
- create/edit PO modal with line items
- supplier performance panel

Components:
- Table
- Line item editor
- Modal
- Status badges

Buttons:
- `Create PO`
- `Send to supplier`
- `Update status`

API Endpoints:
- GET `/api/purchase-orders`
- POST `/api/purchase-orders`
- PUT `/api/purchase-orders/:id/status`
- GET `/api/purchase-orders/supplier-performance`

Database Tables:
- `purchase_orders`
- `purchase_order_items`
- `suppliers`

Functionalities:
- Validate quantities and prices
- Show PO status timeline
- Handle network timeouts and validation errors

### 5.8 Deliveries
Wireframe:
```
+----------------------------------------------------+
| [Schedule Delivery] [Filter by status] [Map view]  |
| Table: Delivery | Origin | Destination | Status |   |
+----------------------------------------------------+
```
UI Layout:
- delivery schedule form
- delivery list and active vehicle map
- quick status update controls

Components:
- Table
- Delivery form
- Map panel
- Badge chips

Buttons:
- `Schedule Delivery`
- `Start`
- `Confirm`
- `Track`

API Endpoints:
- GET `/api/deliveries`
- POST `/api/deliveries`
- PUT `/api/deliveries/:id/start`
- PUT `/api/deliveries/:id/confirm`
- GET `/api/deliveries/active-vehicles`
- POST `/api/deliveries/:id/gps`

Database Tables:
- `deliveries`
- `vehicles`
- `users`
- `facilities`

Functionalities:
- Real-time delivery status updates
- UX when driver data is missing
- Map fallback if API fails

### 5.9 Users & Roles
Wireframe:
```
+-----------------------------------------------------+
| [Add User] [Filter role] [Search]                   |
| Table: Name | Email | Role | Facility | Status |    |
+-----------------------------------------------------+
```
UI Layout:
- user management table
- create/edit user modal
- activation toggle

Components:
- Table
- Form modal
- Toggle switch
- Role dropdown

Buttons:
- `Add User`
- `Deactivate`
- `Reset password`

API Endpoints:
- GET `/api/users`
- POST `/api/auth/register`
- PUT `/api/users/:id/toggle-active`

Database Tables:
- `users`
- `roles`
- `facilities`

Functionalities:
- Role-based access control in UI
- Error state for invalid role assignments
- Confirm user toggles

### 5.10 Reports & Analytics
Wireframe:
```
+------------------------------------------------------+
| [Consumption report] [Export PDF] [Export Excel]     |
| Date range | Filter | Generate                       |
| Chart: Consumption over time                         |
| Table: facility consumption / inventory health       |
+------------------------------------------------------+
```
UI Layout:
- report selection controls
- chart panel
- table output and export buttons

Components:
- Date range picker
- Chart
- Table
- Buttons

Buttons:
- `Generate`
- `Export PDF`
- `Export Excel`

API Endpoints:
- GET `/api/reports/consumption`
- POST `/api/reports/consumption`
- GET `/api/reports/facilities-map`
- GET `/api/reports/export/pdf/:type`
- GET `/api/reports/export/excel/:type`

Database Tables:
- `inventory_transactions`
- `medicine_requests`
- `facilities`
- `stock_batches`

Functionalities:
- Show loading state while report loads
- Handle empty report data and export errors
- Validate report parameters

---

## 6. Section 3: Supplier Portal (5 Pages)
### 6.1 Dashboard
- KPI cards: Pending Orders, Accepted, Rejected, Delivered
- Recent orders table
- Quick status summary

API Endpoints:
- GET `/api/purchase-orders`
- GET `/api/dashboard/stats`

Database Tables:
- `purchase_orders`
- `suppliers`
- `users`

### 6.2 Inventory
- Supplier inventory table
- Add new batch / scan QR
- Low-stock alerts

API Endpoints:
- GET `/api/inventory`
- POST `/api/inventory/batches`
- POST `/api/inventory/scan-qr`

Database Tables:
- `stock_batches`
- `medicines`

### 6.3 Orders
- Purchase orders list
- Accept/reject flows
- Order detail modal

API Endpoints:
- GET `/api/purchase-orders`
- PUT `/api/purchase-orders/:id/status`

Database Tables:
- `purchase_orders`

### 6.4 Deliveries
- Assigned deliveries list
- Delivery status and ETA
- Track shipments

API Endpoints:
- GET `/api/deliveries`
- GET `/api/deliveries/active-vehicles`

Database Tables:
- `deliveries`
- `vehicles`

### 6.5 Invoices
- Invoice list and statuses
- Search by PO
- Download invoices

API Endpoints:
- GET `/api/invoices` (suggested extension)
- GET `/api/invoices/:id`

Database Tables:
- `invoices`
- `purchase_orders`

---

## 7. Section 4: Warehouse Portal (5 Pages)
### 7.1 Dashboard
- Total medicines, low stock, expiring soon, active deliveries
- Current stock table

API Endpoints:
- GET `/api/dashboard/stats`
- GET `/api/inventory`

### 7.2 Stock Management
- Inventory table with filters and batch counts
- Add batch / update stock

API Endpoints:
- GET `/api/inventory`
- POST `/api/inventory/batches`
- GET `/api/inventory/low-stock`
- GET `/api/inventory/expiring`

### 7.3 Receiving Medicines
- Receive delivery form
- Scan QR / barcode
- Confirm receipt

API Endpoints:
- POST `/api/inventory/scan-qr`
- POST `/api/inventory/batches`

### 7.4 Dispatch Medicines
- Create dispatch requests
- Select destination facility
- Set delivery window

API Endpoints:
- POST `/api/deliveries`
- POST `/api/requests`

### 7.5 QR/Barcode Scanner
- Full-screen scanner UI
- Scan result handling
- Inventory lookup and quick actions

API Endpoints:
- POST `/api/inventory/scan-qr`

---

## 8. Section 5: Health Facility Portal (5 Pages)
### 8.1 Dashboard
- Current stock overview
- Pending requests and deliveries
- Low stock alerts

API Endpoints:
- GET `/api/inventory`
- GET `/api/requests`

### 8.2 Current Stock
- Stock table with alert badges
- Search by medicine name

API Endpoints:
- GET `/api/inventory`
- GET `/api/inventory/low-stock`

### 8.3 Request Medicines
- Request form with medicine line items
- Priority selector and justification

API Endpoints:
- POST `/api/requests`

### 8.4 Track Delivery
- Delivery tracking status list
- ETA and driver contacts

API Endpoints:
- GET `/api/deliveries`
- GET `/api/deliveries/active-vehicles`

### 8.5 Receive Medicines
- Confirm receiving delivery
- Update inventory after receipt

API Endpoints:
- PUT `/api/deliveries/:id/confirm`
- POST `/api/inventory/batches`

---

## 9. Section 6: Driver Portal (4 Pages)
### 9.1 Dashboard
- Today's deliveries, active, completed
- Quick action cards

API Endpoints:
- GET `/api/deliveries`

### 9.2 Assigned Deliveries
- Delivery list with origin/destination
- Start/confirm actions

API Endpoints:
- GET `/api/deliveries`
- PUT `/api/deliveries/:id/start`
- PUT `/api/deliveries/:id/confirm`

### 9.3 Live GPS Tracking
- Map with current vehicle location
- Real-time update with polling or sockets

API Endpoints:
- POST `/api/deliveries/:id/gps`
- GET `/api/deliveries/active-vehicles`

### 9.4 Delivery Confirmation
- Proof-of-delivery capture
- Signature/photo upload

API Endpoints:
- PUT `/api/deliveries/:id/confirm`
- POST `/api/deliveries/:id/proof` (suggested extension)

---

## 10. Section 7: Smart Features (7 Pages)
### 10.1 AI Forecasting
Wireframe:
```
+----------------------------------------------+
| Select facility | Select medicine | Generate |
| Chart: Forecasted demand next 6 months      |
| Table: Forecasted quantity by month         |
+----------------------------------------------+
```
API Endpoints:
- GET `/api/ai/forecast`
- GET `/api/ai/forecasts`

Database Tables:
- `ai_forecasts`
- `medicines`
- `facilities`

Functionalities:
- Display model status
- Handle AI module unavailability gracefully
- Show confidence bands and alerts

### 10.2 GIS Map
- Interactive map with facilities, warehouses, vehicles
- Filter by role and entity type

API Endpoints:
- GET `/api/reports/facilities-map`
- GET `/api/deliveries/active-vehicles`

### 10.3 Notifications
- Notifications feed
- Mark read / mark all read

API Endpoints:
- GET `/api/notifications`
- PUT `/api/notifications/:id/read`
- PUT `/api/notifications/read-all`

Database Tables:
- `notifications`

### 10.4 Expiry Monitoring
- List of expiring batches
- Alert and action buttons

API Endpoints:
- GET `/api/inventory/expiring`

Database Tables:
- `stock_batches`

### 10.5 Emergency Requests
- Emergency request form
- Fast-track approvals
- Alert banner for high-priority deliveries

API Endpoints:
- POST `/api/requests`
- GET `/api/requests`

### 10.6 System Settings
- Theme toggle, profile settings, role assignment
- Feature switches and system config

API Endpoints:
- GET `/api/auth/profile`
- PUT `/api/auth/change-password`
- POST `/api/auth/setup-2fa`
- POST `/api/auth/enable-2fa`
- POST `/api/auth/disable-2fa`

### 10.7 User Profile
- Personal data, password change, 2FA controls
- Recent activity and audit log preview

API Endpoints:
- GET `/api/auth/profile`
- PUT `/api/auth/change-password`

Database Tables:
- `users`
- `audit_logs`

---

## 11. Error Handling & Data-Driven Frontend Strategy
### 11.1 Global Error Handling
- Use a shared error boundary for React pages
- Capture and display errors from API calls
- Use Axios interceptor for 401/expired token handling
- Show friendly fallback UI for network failures
- Provide retry actions for critical loads

### 11.2 Form Validation
- Client-side validation for required fields and formats
- Display field-level validation errors
- Display server validation errors returned by API
- Keep form data when users correct errors

### 11.3 Empty and Loading States
- Show skeleton loaders while fetching data
- Show empty-state illustrations for no-data views
- Display informative messages when lists are empty

### 11.4 Data-Driven UI
- Render pages based on the data shape returned by APIs
- Use the following patterns:
  - `data?.data || []`
  - `if (!data) return <Loading />`
  - `if (error) return <ErrorCard message={error.message} />`
- Build reusable components that accept props:
  - `StatCard`
  - `DataTable`
  - `FilterBar`
  - `PageHeader`

### 11.5 Role-Based UI
- Show/hide navigation links by user role
- Protect routes in React with `PrivateRoute`
- Use server-side authorization as authority source

---

## 12. Frontend Structure Plan
### 12.1 Folder Structure
Suggested extension to current app:
- `src/components/shared/` — layout, sidebar, topbar, modals
- `src/components/ui/` — buttons, cards, inputs, badges, tables, charts
- `src/pages/admin/` — admin-specific dashboards and pages
- `src/pages/supplier/`, `src/pages/warehouse/`, `src/pages/facility/`, `src/pages/driver/`
- `src/hooks/` — data hooks like `useFetch`, `useAuth`, `useNotifications`
- `src/context/` — auth, app settings
- `src/services/` — api service wrappers, notification service
- `src/utils/` — formatting, status helpers, role helpers

### 12.2 Shared Components
- `Layout`
- `Sidebar`
- `Topbar`
- `StatCard`
- `DataTable`
- `Modal`
- `FilterBar`
- `ChartCard`

### 12.3 Responsive Design
- Mobile sidebar drawer
- Compact tables, card stacking on small screens
- Collapse chart panels to single column
- Use CSS grid and flexbox for responsive card layouts
- Provide accessible touch targets and dark mode support

---

## 13. Backend Structure Plan
### 13.1 API Categories
- Auth
- Inventory
- Requests
- Purchase Orders
- Deliveries
- Reports
- Notifications
- AI Forecasting
- Facilities
- Users

### 13.2 Recommended Endpoint Extensions
The current backend has strong support for many flows, but the UI plan also needs:
- `/api/suppliers`
- `/api/warehouses`
- `/api/invoices`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/deliveries/:id/proof`
- `/api/settings`

---

## 14. Database Tables Used
Core tables implied by the UI:
- `users`
- `roles`
- `medicines`
- `medicine_categories`
- `stock_batches`
- `medicine_requests`
- `purchase_orders`
- `purchase_order_items`
- `deliveries`
- `vehicles`
- `facilities`
- `warehouses`
- `suppliers`
- `notifications`
- `ai_forecasts`
- `districts`
- `provinces`
- `supplier_performance`
- `audit_logs`
- `password_resets`

---

## 15. Design System & UI Guidelines
### 15.1 Color System
- Primary: deep blue
- Secondary: teal
- Success: green
- Warning: amber
- Danger: red
- Neutral: slate/gray

### 15.2 Typography
- Heading font: strong sans-serif
- Body font: legible sans-serif
- Use consistent sizing for headings, labels, and body text

### 15.3 UI Patterns
- Card-based dashboard panels
- Table row actions with icons
- Sticky headers for tables and sidebars
- Modal form overlays for create/edit
- Toasts for success / error notifications

---

## 16. Recommended Next Step
1. Confirm the exact data payloads for each page.
2. Implement the authentication error and validation flows first.
3. Build role-specific dashboards using the current `Dashboard.jsx` patterns.
4. Add missing REST endpoints for supplier, warehouse, invoices, and auth recovery.

If you provide sample JSON or entity schemas, I can continue by generating the matching frontend page structure and component code.
