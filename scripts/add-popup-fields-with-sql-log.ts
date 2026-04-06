
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function migrate() {
  console.log('Starting migration: Adding popup fields to notices table...');

  const sql = `
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_popup BOOLEAN DEFAULT false;
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS link_url TEXT;
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS link_text TEXT DEFAULT '자세히 보기';
  `;

  console.log('SQL to run manually:', sql);
}

// migrate();
