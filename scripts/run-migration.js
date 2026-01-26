const { Client } = require('pg');
const fs = require('fs');

const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node run-migration.js <migration-file>');
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Running migration:', migrationFile);
  
  await client.query(sql);
  console.log('✅ Migration complete!');
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
