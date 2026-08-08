-- ============================================
-- SMART MEDICAL SUPPLY CHAIN - DATABASE SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS & ROLES
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- MOH_ADMIN, WAREHOUSE_MANAGER, DISTRICT_HOSPITAL, HEALTH_CENTER, SUPPLIER, DRIVER
  permissions JSONB DEFAULT '{}'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT REFERENCES roles(id),
  facility_id UUID,
  two_fa_secret VARCHAR(100),
  two_fa_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- LOCATIONS / FACILITIES
CREATE TABLE provinces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  province_id INT REFERENCES provinces(id)
);

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL, -- HEALTH_CENTER, DISTRICT_HOSPITAL, CENTRAL_WAREHOUSE, SUPPLIER
  district_id INT REFERENCES districts(id),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MEDICINES
CREATE TABLE medicine_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150),
  category_id INT REFERENCES medicine_categories(id),
  unit VARCHAR(50) NOT NULL, -- tablets, capsules, sachets, bags, vials
  unit_price DECIMAL(10,2),
  reorder_level INT DEFAULT 100,
  safety_stock INT DEFAULT 50,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id),
  medicine_id UUID REFERENCES medicines(id),
  quantity INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, medicine_id)
);

-- STOCK BATCHES (Barcode/QR)
CREATE TABLE stock_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID REFERENCES medicines(id),
  facility_id UUID REFERENCES facilities(id),
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  quantity INT NOT NULL,
  remaining_quantity INT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  qr_code TEXT UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  supplier_id UUID REFERENCES facilities(id),
  received_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, CONSUMED, RECALLED
  created_at TIMESTAMP DEFAULT NOW()
);

-- MEDICINE REQUESTS
CREATE TABLE medicine_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  requesting_facility_id UUID REFERENCES facilities(id),
  approving_facility_id UUID REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, FULFILLED, CANCELLED
  priority VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, HIGH, EMERGENCY
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  fulfilled_at TIMESTAMP
);

CREATE TABLE medicine_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES medicine_requests(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  requested_quantity INT NOT NULL,
  approved_quantity INT,
  fulfilled_quantity INT,
  unit_price DECIMAL(10,2)
);

-- PURCHASE ORDERS (Warehouse → Supplier)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES facilities(id),
  supplier_id UUID REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'SENT', -- SENT, ACCEPTED, REJECTED, PREPARING, SHIPPED, DELIVERED
  total_amount DECIMAL(12,2),
  created_by UUID REFERENCES users(id),
  notes TEXT,
  expected_delivery DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2)
);

-- VEHICLES & DRIVERS
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50), -- TRUCK, VAN, MOTORCYCLE
  capacity_kg DECIMAL(8,2),
  driver_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, ON_TRIP, MAINTENANCE
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DELIVERIES
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  request_id UUID REFERENCES medicine_requests(id),
  po_id UUID REFERENCES purchase_orders(id),
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES users(id),
  origin_facility_id UUID REFERENCES facilities(id),
  destination_facility_id UUID REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'ASSIGNED', -- ASSIGNED, IN_TRANSIT, DELIVERED, FAILED
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  gps_tracking_active BOOLEAN DEFAULT false,
  route_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES stock_batches(id),
  medicine_id UUID REFERENCES medicines(id),
  quantity INT NOT NULL,
  confirmed_quantity INT,
  qr_scanned BOOLEAN DEFAULT false,
  scanned_at TIMESTAMP
);

-- GPS TRACKING LOGS
CREATE TABLE gps_logs (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  delivery_id UUID REFERENCES deliveries(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(6,2),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  facility_id UUID REFERENCES facilities(id),
  type VARCHAR(80) NOT NULL, -- LOW_STOCK, OUT_OF_STOCK, EXPIRY_ALERT, DELIVERY_STARTED, etc.
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'NORMAL',
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI FORECASTING DATA
CREATE TABLE consumption_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id),
  medicine_id UUID REFERENCES medicines(id),
  quantity_consumed INT NOT NULL,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, medicine_id, period_month, period_year)
);

CREATE TABLE ai_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id),
  medicine_id UUID REFERENCES medicines(id),
  forecast_month INT NOT NULL,
  forecast_year INT NOT NULL,
  predicted_quantity INT NOT NULL,
  confidence_score DECIMAL(5,2),
  model_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, medicine_id, forecast_month, forecast_year)
);

-- SUPPLIER PERFORMANCE
CREATE TABLE supplier_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES facilities(id),
  po_id UUID REFERENCES purchase_orders(id),
  on_time_delivery BOOLEAN,
  quality_score INT CHECK (quality_score BETWEEN 1 AND 5),
  delivery_days INT,
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_inventory_facility ON inventory(facility_id);
CREATE INDEX idx_inventory_medicine ON inventory(medicine_id);
CREATE INDEX idx_batches_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_batches_facility ON stock_batches(facility_id);
CREATE INDEX idx_requests_status ON medicine_requests(status);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_gps_logs_vehicle ON gps_logs(vehicle_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_consumption_facility ON consumption_history(facility_id, medicine_id);

-- SEED ROLES
INSERT INTO roles (name, permissions) VALUES
('MOH_ADMIN', '{"all": true}'),
('WAREHOUSE_MANAGER', '{"inventory": true, "orders": true, "deliveries": true, "reports": true}'),
('DISTRICT_HOSPITAL', '{"requests": true, "inventory": true, "reports": true}'),
('HEALTH_CENTER', '{"requests": true, "inventory": true}'),
('SUPPLIER', '{"orders": true, "deliveries": true}'),
('DRIVER', '{"deliveries": true, "gps": true}');

-- SEED PROVINCES
INSERT INTO provinces (name) VALUES ('Kigali City'),('Northern Province'),('Southern Province'),('Eastern Province'),('Western Province');

-- SEED DISTRICTS
INSERT INTO districts (name, province_id) VALUES
('Gasabo',1),('Kicukiro',1),('Nyarugenge',1),
('Burera',2),('Gakenke',2),('Gicumbi',2),('Musanze',2),('Rulindo',2),
('Gisagara',3),('Huye',3),('Kamonyi',3),('Muhanga',3),('Nyamagabe',3),('Nyanza',3),('Nyaruguru',3),('Ruhango',3),
('Bugesera',4),('Gatsibo',4),('Kayonza',4),('Kirehe',4),('Ngoma',4),('Nyagatare',4),('Rwamagana',4),
('Karongi',5),('Ngororero',5),('Nyabihu',5),('Nyamasheke',5),('Rubavu',5),('Rutsiro',5),('Rusizi',5);

-- SEED MEDICINE CATEGORIES
INSERT INTO medicine_categories (name) VALUES
('Antibiotics'),('Analgesics'),('Antimalarials'),('Oral Rehydration'),('IV Fluids'),
('Vitamins & Supplements'),('Vaccines'),('Antifungals'),('Antiretrovirals'),('Emergency Medicines');

-- SEED MEDICINES
INSERT INTO medicines (name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock) VALUES
('Paracetamol 500mg','Paracetamol',2,'tablets',15,5000,2000),
('Amoxicillin 500mg','Amoxicillin',1,'capsules',45,3000,1000),
('ORS Sachets','Oral Rehydration Salts',4,'sachets',120,1000,500),
('IV Normal Saline 1L','Sodium Chloride 0.9%',5,'bags',800,200,100),
('Artemether-Lumefantrine','Coartem',3,'tablets',350,2000,800),
('Metronidazole 400mg','Metronidazole',1,'tablets',25,2000,800),
('Cotrimoxazole 480mg','Cotrimoxazole',1,'tablets',20,3000,1000),
('Vitamin A 200000IU','Retinol',6,'capsules',50,1000,400),
('Zinc Sulfate 20mg','Zinc',6,'tablets',30,1000,400),
('Oxytocin 10IU','Oxytocin',10,'vials',500,500,200),
('Diazepam 10mg','Diazepam',10,'vials',300,300,100),
('Magnesium Sulfate 50%','Magnesium Sulfate',10,'vials',400,300,100),
('Fluconazole 150mg','Fluconazole',8,'capsules',200,500,200),
('Tenofovir/Lamivudine/Dolutegravir','TLD',9,'tablets',1200,1000,400),
('Measles Vaccine','Measles-Rubella',7,'vials',2500,200,100);
