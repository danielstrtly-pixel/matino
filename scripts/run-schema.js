const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

async function runSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema...');
    await client.query(sql);
    console.log('✅ Schema applied successfully!');

    // Verify tables were created
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\nTables created:');
    rows.forEach(r => console.log(`  - ${r.table_name}`));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSchema();
