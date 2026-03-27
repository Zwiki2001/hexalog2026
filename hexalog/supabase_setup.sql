-- Run this in Supabase SQL Editor
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_type TEXT DEFAULT 'B2B',
  client JSONB,
  shipment JSONB,
  price TEXT DEFAULT 'TBD',
  paid BOOLEAN DEFAULT FALSE,
  pod TEXT,
  timeline JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON orders FOR ALL USING (true) WITH CHECK (true);
