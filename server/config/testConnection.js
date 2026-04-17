require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected:', conn.connection.host);
    console.log('   Database name    :', conn.connection.name);
    console.log('   Connection state :', conn.connection.readyState === 1 ? 'Connected' : 'Unknown');
    await mongoose.disconnect();
    console.log('🔌 Disconnected cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
