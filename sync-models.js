require('dotenv').config();
const { syncAllProviders } = require('./backend/services/model-sync.service');
const db = require('./database');

async function runSync() {
  console.log('\n🚀 Starting full provider sync...\n');
  const results = await syncAllProviders();

  for (const r of results) {
    if (r.status === 'success') {
      console.log(`✅ [${r.provider}] — ${r.count} models synced`);
    } else {
      console.error(`❌ [${r.provider}] — Error: ${r.error}`);
    }
  }

  // Show DB totals
  const total = await db.model.count();
  const active = await db.model.count({ where: { is_active: true } });
  console.log(`\n📊 DB Summary: ${active} active / ${total} total models`);

  await db.closeDatabase();
  console.log('\n🏁 Sync complete.\n');
}

runSync().catch(err => { console.error(err); process.exit(1); });

