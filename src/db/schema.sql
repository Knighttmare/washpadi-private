CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user_roles (
  auth_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  created_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Washing', 'Ironing', 'Ready', 'Delivered')),
  pickup_at TIMESTAMPTZ,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Pay on pickup', 'Demo online')),
  payment_status TEXT NOT NULL DEFAULT 'Due at pickup' CHECK (payment_status IN ('Quote pending', 'Due at pickup', 'Paid (demo)', 'Paid at pickup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tag TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  price NUMERIC(10, 2) CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL CHECK (method IN ('Pay on pickup', 'Demo online')),
  status TEXT NOT NULL CHECK (status IN ('Due at pickup', 'Paid (demo)', 'Paid at pickup')),
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer-selected laundry options and care instructions.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_express BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_slot TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS care_instructions TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_low NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_high NUMERIC(10, 2);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Received', 'Washing', 'Ironing', 'Ready', 'Delivered'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS care_tags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS customer_care_preferences (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT '',
  care_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_issue_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  note TEXT NOT NULL,
  photo_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_customer_created_idx ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments(status, created_at DESC);

-- Existing installs: customer-submitted orders can wait for a staff quote.
ALTER TABLE order_items ALTER COLUMN price DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('Quote pending', 'Due at pickup', 'Paid (demo)', 'Paid at pickup'));
