#!/usr/bin/env node

/**
 * Seed Demo Accounts Script
 * Creates demo user accounts for testing the application
 *
 * Usage:
 *   node scripts/seedDemoAccounts.js
 *
 * Demo Accounts:
 *   - Shipper: 0788000001 / password123
 *   - Transporter: 0789000003 / password123
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User model
const User = require('../src/models/user');

// Demo accounts to create
const DEMO_ACCOUNTS = [
  {
    name: 'Test Shipper',
    phone: '0788000001',
    password: 'password123',
    role: 'farmer', // Backend role for shipper
    description: 'Demo shipper account'
  },
  {
    name: 'Test Transporter',
    phone: '0789000003',
    password: 'password123',
    role: 'transporter',
    description: 'Demo transporter account'
  }
];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Create demo accounts
 */
const seedDemoAccounts = async () => {
  try {
    console.log('\n🌱 Starting demo account seeding...\n');

    for (const account of DEMO_ACCOUNTS) {
      console.log(`📝 Processing: ${account.description}`);
      console.log(`   Name: ${account.name}`);
      console.log(`   Phone: ${account.phone}`);
      console.log(`   Role: ${account.role}`);

      // Check if account already exists
      const existingUser = await User.findOne({ phone: account.phone });

      if (existingUser) {
        console.log(`   ⚠️  Account already exists - skipping\n`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(account.password, salt);

      // Create user
      const user = await User.create({
        name: account.name,
        phone: account.phone,
        password: hashedPassword,
        role: account.role,
        failedLoginAttempts: 0
      });

      console.log(`   ✅ Account created successfully (ID: ${user._id})\n`);
    }

    console.log('🎉 Demo account seeding completed!\n');
    console.log('📱 Demo Credentials:');
    console.log('   Shipper:     0788000001 / password123');
    console.log('   Transporter: 0789000003 / password123\n');

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    await connectDB();
    await seedDemoAccounts();

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
};

// Run the script
main();
