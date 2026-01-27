#!/usr/bin/env node

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = 'gepkjyzqrjkuminphpxm';

// Try different connection strings
const connectionStrings = [
  // Supavisor transaction mode (eu-north-1 is common for EU projects)
  `postgres://postgres.${projectRef}:${serviceRoleKey}@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`,
  // Direct connection
  `postgres://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`,
];

const migrationSQL = `
-- Migration 003: Create menus tables

-- Menus table
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Menu items table  
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  meal TEXT NOT NULL DEFAULT 'dinner',
  recipe JSONB NOT NULL,
  matched_offers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menus_user_id ON menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menus_active ON menus(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);

-- Enable RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can manage their menus" ON menus;
DROP POLICY IF EXISTS "Users can manage menu items" ON menu_items;

-- Create policies
CREATE POLICY "Users can manage their menus" ON menus FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage menu items" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid())
);
`;

async function tryConnection(connectionString, name) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log(`Trying ${name}...`);
    await client.connect();
    console.log(`✅ Connected via ${name}`);
    
    console.log('Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration complete!');
    
    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('menus', 'menu_items')
    `);
    console.log('Tables created:', result.rows.map(r => r.table_name).join(', '));
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ ${name} failed:`, error.message);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  console.log('Supabase Migration Runner\n');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await tryConnection(connectionStrings[i], `Connection ${i + 1}`);
    if (success) {
      process.exit(0);
    }
  }
  
  console.log('\n❌ All connection methods failed.');
  console.log('Please run the migration manually in Supabase Dashboard.');
  process.exit(1);
}

main();
