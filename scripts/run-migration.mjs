#!/usr/bin/env node

/**
 * Run database migrations using Supabase service role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('Running migration 003_menus.sql...\n');

  // Create menus table
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS menus (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `
  });
  
  if (error1) {
    console.log('Note: exec_sql not available, trying alternative...');
    
    // Alternative: Use raw REST API
    // Supabase doesn't support raw SQL via REST, need to use individual operations
    // Let's check if tables exist first
    
    const { data: tables } = await supabase
      .from('menus')
      .select('id')
      .limit(1);
    
    if (tables !== null) {
      console.log('✅ menus table already exists');
    } else {
      console.log('❌ menus table does not exist - please run migration manually');
      console.log('\nSQL to run in Supabase Dashboard:');
      console.log('https://supabase.com/dashboard/project/gepkjyzqrjkuminphpxm/sql/new\n');
      
      const migrationSql = readFileSync(join(__dirname, '..', 'supabase/migrations/003_menus.sql'), 'utf-8');
      console.log(migrationSql);
      return;
    }
  } else {
    console.log('✅ menus table created');
  }

  console.log('\nMigration complete!');
}

runMigration().catch(console.error);
