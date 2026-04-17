const mongoose = require('mongoose');

/**
 * Establishes MongoDB connection using MONGO_URI from .env
 * Call connectDB() once in server.js before starting the Express server.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are defaults in Mongoose 7+ but explicit for clarity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Log when connection drops (useful for Atlas free-tier timeouts)
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // Kill server if DB cannot connect
  }
};

module.exports = connectDB;
