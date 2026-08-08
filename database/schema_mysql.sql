-- ============================================
-- SMART MEDICAL SUPPLY CHAIN - MYSQL SCHEMA
-- ============================================

CREATE DATABASE IF NOT EXISTS medical_supply_chain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medical_supply_chain;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSON DEFAULT ('{}')
);

CREATE TABLE IF NOT EXISTS provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  province_id INT REFERENCES provinces(id)
);

CREATE TABLE IF NOT EXISTS facilities (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,
  district_id INT REFERENCES districts(id),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT REFERENCES roles(id),
  facility_id CHAR(36),
  two_fa_secret VARCHAR(100),
  two_fa_enabled TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150),
  category_id INT REFERENCES medicine_categories(id),
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2),
  reorder_level INT DEFAULT 100,
  safety_stock INT DEFAULT 50,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  facility_id CHAR(36) REFERENCES facilities(id),
  medicine_id CHAR(36) REFERENCES medicines(id),
  quantity INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_facility_medicine (facility_id, medicine_id)
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id CHAR(36) PRIMARY KEY,
  medicine_id CHAR(36) REFERENCES medicines(id),
  facility_id CHAR(36) REFERENCES facilities(id),
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  quantity INT NOT NULL,
  remaining_quantity INT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  qr_code TEXT,
  barcode VARCHAR(100) UNIQUE,
  supplier_id CHAR(36),
  received_date DATE DEFAULT (CURDATE()),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_requests (
  id CHAR(36) PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  requesting_facility_id CHAR(36) REFERENCES facilities(id),
  approving_facility_id CHAR(36) REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'PENDING',
  priority VARCHAR(20) DEFAULT 'NORMAL',
  requested_by CHAR(36) REFERENCES users(id),
  approved_by CHAR(36) REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  fulfilled_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS medicine_request_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  request_id CHAR(36) REFERENCES medicine_requests(id),
  medicine_id CHAR(36) REFERENCES medicines(id),
  requested_quantity INT NOT NULL,
  approved_quantity INT,
  fulfilled_quantity INT,
  unit_price DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id CHAR(36) PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id CHAR(36) REFERENCES facilities(id),
  supplier_id CHAR(36) REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'SENT',
  total_amount DECIMAL(12,2),
  created_by CHAR(36) REFERENCES users(id),
  notes TEXT,
  expected_delivery DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  po_id CHAR(36) REFERENCES purchase_orders(id),
  medicine_id CHAR(36) REFERENCES medicines(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50),
  capacity_kg DECIMAL(8,2),
  driver_id CHAR(36) REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
  id CHAR(36) PRIMARY KEY,
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  request_id CHAR(36),
  po_id CHAR(36),
  vehicle_id CHAR(36) REFERENCES vehicles(id),
  driver_id CHAR(36) REFERENCES users(id),
  origin_facility_id CHAR(36) REFERENCES facilities(id),
  destination_facility_id CHAR(36) REFERENCES facilities(id),
  status VARCHAR(50) DEFAULT 'ASSIGNED',
  estimated_arrival TIMESTAMP NULL,
  actual_arrival TIMESTAMP NULL,
  gps_tracking_active TINYINT(1) DEFAULT 0,
  route_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS delivery_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  delivery_id CHAR(36) REFERENCES deliveries(id),
  batch_id CHAR(36),
  medicine_id CHAR(36) REFERENCES medicines(id),
  quantity INT NOT NULL,
  confirmed_quantity INT,
  qr_scanned TINYINT(1) DEFAULT 0,
  scanned_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS gps_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id CHAR(36) REFERENCES vehicles(id),
  delivery_id CHAR(36) REFERENCES deliveries(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(6,2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  facility_id CHAR(36),
  type VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'NORMAL',
  reference_id CHAR(36),
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumption_history (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  facility_id CHAR(36) REFERENCES facilities(id),
  medicine_id CHAR(36) REFERENCES medicines(id),
  quantity_consumed INT NOT NULL,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_consumption (facility_id, medicine_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS ai_forecasts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  facility_id CHAR(36) REFERENCES facilities(id),
  medicine_id CHAR(36) REFERENCES medicines(id),
  forecast_month INT NOT NULL,
  forecast_year INT NOT NULL,
  predicted_quantity INT NOT NULL,
  confidence_score DECIMAL(5,2),
  model_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_performance (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  supplier_id CHAR(36) REFERENCES facilities(id),
  po_id CHAR(36) REFERENCES purchase_orders(id),
  on_time_delivery TINYINT(1),
  quality_score INT CHECK (quality_score BETWEEN 1 AND 5),
  delivery_days INT,
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_inventory_facility  ON inventory(facility_id);
CREATE INDEX idx_inventory_medicine  ON inventory(medicine_id);
CREATE INDEX idx_batches_expiry      ON stock_batches(expiry_date);
CREATE INDEX idx_batches_facility    ON stock_batches(facility_id);
CREATE INDEX idx_requests_status     ON medicine_requests(status);
CREATE INDEX idx_deliveries_status   ON deliveries(status);
CREATE INDEX idx_gps_logs_vehicle    ON gps_logs(vehicle_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_consumption_facility ON consumption_history(facility_id, medicine_id);

-- SEED ROLES
INSERT IGNORE INTO roles (name, permissions) VALUES
('MOH_ADMIN',         '{"all": true}'),
('WAREHOUSE_MANAGER', '{"inventory": true, "orders": true, "deliveries": true, "reports": true}'),
('DISTRICT_HOSPITAL', '{"requests": true, "inventory": true, "reports": true}'),
('HEALTH_CENTER',     '{"requests": true, "inventory": true}'),
('SUPPLIER',          '{"orders": true, "deliveries": true}'),
('DRIVER',            '{"deliveries": true, "gps": true}');

-- SEED PROVINCES
INSERT IGNORE INTO provinces (name) VALUES
('Kigali City'),('Northern Province'),('Southern Province'),('Eastern Province'),('Western Province');

-- SEED DISTRICTS
INSERT IGNORE INTO districts (name, province_id) VALUES
('Gasabo',1),('Kicukiro',1),('Nyarugenge',1),
('Burera',2),('Gakenke',2),('Gicumbi',2),('Musanze',2),('Rulindo',2),
('Gisagara',3),('Huye',3),('Kamonyi',3),('Muhanga',3),('Nyamagabe',3),('Nyanza',3),('Nyaruguru',3),('Ruhango',3),
('Bugesera',4),('Gatsibo',4),('Kayonza',4),('Kirehe',4),('Ngoma',4),('Nyagatare',4),('Rwamagana',4),
('Karongi',5),('Ngororero',5),('Nyabihu',5),('Nyamasheke',5),('Rubavu',5),('Rutsiro',5),('Rusizi',5);

-- SEED MEDICINE CATEGORIES
INSERT IGNORE INTO medicine_categories (name) VALUES
('Antibiotics'),('Analgesics'),('Antimalarials'),('Oral Rehydration'),('IV Fluids'),
('Vitamins & Supplements'),('Vaccines'),('Antifungals'),('Antiretrovirals'),('Emergency Medicines');

-- SEED MEDICINES
INSERT IGNORE INTO medicines (id, name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock) VALUES
(UUID(),'Paracetamol 500mg','Paracetamol',2,'tablets',15,5000,2000),
(UUID(),'Amoxicillin 500mg','Amoxicillin',1,'capsules',45,3000,1000),
(UUID(),'ORS Sachets','Oral Rehydration Salts',4,'sachets',120,1000,500),
(UUID(),'IV Normal Saline 1L','Sodium Chloride 0.9%',5,'bags',800,200,100),
(UUID(),'Artemether-Lumefantrine','Coartem',3,'tablets',350,2000,800),
(UUID(),'Metronidazole 400mg','Metronidazole',1,'tablets',25,2000,800),
(UUID(),'Cotrimoxazole 480mg','Cotrimoxazole',1,'tablets',20,3000,1000),
(UUID(),'Vitamin A 200000IU','Retinol',6,'capsules',50,1000,400),
(UUID(),'Zinc Sulfate 20mg','Zinc',6,'tablets',30,1000,400),
(UUID(),'Oxytocin 10IU','Oxytocin',10,'vials',500,500,200),
(UUID(),'Diazepam 10mg','Diazepam',10,'vials',300,300,100),
(UUID(),'Magnesium Sulfate 50%','Magnesium Sulfate',10,'vials',400,300,100),
(UUID(),'Fluconazole 150mg','Fluconazole',8,'capsules',200,500,200),
(UUID(),'Tenofovir/Lamivudine/Dolutegravir','TLD',9,'tablets',1200,1000,400),
(UUID(),'Measles Vaccine','Measles-Rubella',7,'vials',2500,200,100);
