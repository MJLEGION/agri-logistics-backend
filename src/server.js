const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Initialize express
const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8082',
      'http://localhost:19006',
      'http://localhost:19000',
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_PRODUCTION
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - can restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Legacy crop routes (backward compatibility)
app.use('/api/crops', require('./routes/cropRoutes'));

// NEW cargo/product routes
app.use('/api/cargo', require('./routes/cargoRoutes'));

// Trip management
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Transporter management
app.use('/api/transporters', require('./routes/transporterRoutes'));

// Payment processing
app.use('/api/payments', require('./routes/paymentRoutes'));

// Rating & review system
app.use('/api/ratings', require('./routes/ratingRoutes'));

// Wallet & balance management
app.use('/api/wallet', require('./routes/walletRoutes'));

// Cargo-Transporter matching
app.use('/api/matching', require('./routes/matchingRoutes'));

// Location & Real-time tracking
app.use('/api/location', require('./routes/locationRoutes'));

// Payment Escrow System Routes
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/escrows', require('./routes/escrowRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));
app.use('/api/disputes', require('./routes/disputeRoutes'));
app.use('/api/wallets', require('./routes/walletRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Agri-Logistics API',
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth - Authentication & user management',
      cargo: '/api/cargo - NEW: Cargo/product listing with advanced features',
      crops: '/api/crops - Legacy: Crop listing (backward compatibility)',
      trips: '/api/trips - NEW: Trip management & cargo assignments',
      orders: '/api/orders - Legacy: Orders (backward compatibility)',
      transporters: '/api/transporters - Transporter profiles & management',
      payments: '/api/payments - Payment processing (MoMo + Flutterwave + legacy endpoints)',
      momo: '/api/payments/momo - NEW: MTN MoMo mobile money integration',
      ratings: '/api/ratings - NEW: Rating & review system',
      wallet: '/api/wallet - NEW: Wallet & balance management',
      matching: '/api/matching - NEW: Cargo-transporter matching',
      location: '/api/location - NEW: Real-time location tracking & nearby search',
      transactions: '/api/transactions - Transactions & payments',
      escrows: '/api/escrows - Payment escrow system',
      receipts: '/api/receipts - Receipt generation',
      disputes: '/api/disputes - Dispute management',
      wallets: '/api/wallets - Wallet management (legacy)'
    },
    features: [
      '✅ MTN MoMo mobile money payment integration',
      '✅ Advanced cargo search & filtering',
      '✅ Trip management with status tracking',
      '✅ Comprehensive rating & review system',
      '✅ Wallet management with KYC verification',
      '✅ Intelligent cargo-transporter matching',
      '✅ Payment processing with escrow support',
      '✅ Real-time location tracking',
      '✅ Distance-based search',
      '✅ Leaderboard & transporter stats'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Connect to database then start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for compatibility
module.exports = app;