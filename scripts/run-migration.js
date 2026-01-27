#!/usr/bin/env node

/**
 * Run database migration for Edamam preferences
 * Usage: node scripts/run-migration.js
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runMigration() {
  // Supabase doesn't allow raw SQL via REST API
  // We need to use the database connection string or Supabase Dashboard
  // Instead, let's check current columns and add missing ones via individual ALTER statements
  
  const columns = [
    { name: 'health_labels', type: "TEXT[] DEFAULT '{}'", default: "'{}'" },
    { name: 'diet_labels', type: "TEXT[] DEFAULT '{}'", default: "'{}'" },
    { name: 'cuisine_types', type: "TEXT[] DEFAULT '{}'", default: "'{}'" },
    { name: 'meals_per_week', type: 'INTEGER DEFAULT 5', default: '5' },
    { name: 'max_cook_time', type: 'INTEGER DEFAULT 45', default: '45' },
    { name: 'include_lunch', type: 'BOOLEAN DEFAULT false', default: 'false' },
    { name: 'has_children', type: 'BOOLEAN DEFAULT false', default: 'false' },
  ];

  console.log('Migration SQL to run in Supabase Dashboard:\n');
  console.log('-- Run this in Supabase SQL Editor');
  console.log('-- https://supabase.com/dashboard/project/gepkjyzqrjkuminphpxm/sql/new\n');
  
  for (const col of columns) {
    console.log(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  }
  
  console.log('\n-- Verify columns exist:');
  console.log("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_preferences';");
}

runMigration();
