const mongoose = require('mongoose');
const path = require('path');
const Order = require('../models/order');

// Load .env from backend root directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Display all orders with details
const listAllOrders = async () => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    if (orders.length === 0) {
      log.warning('No orders found in database');
      return [];
    }

    log.header(`Found ${orders.length} order items:`);

    orders.forEach((order, index) => {
      console.log(`\n${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}Order #${order._id}${colors.reset}`);
      console.log(`    ID: ${colors.yellow}${order._id}${colors.reset}`);
      console.log(`    Quantity: ${order.quantity} units`);
      console.log(`    Total Price: ${order.totalPrice} RWF`);
      console.log(`    Status: ${order.status}`);
      console.log(`    Crop ID: ${order.cropId}`);
      console.log(`    Farmer ID: ${order.farmerId}`);
      console.log(`    Buyer ID: ${order.buyerId}`);
      console.log(`    Transporter ID: ${order.transporterId || 'Not assigned'}`);
      console.log(`    Pickup: ${order.pickupLocation?.address || 'Not set'}`);
      console.log(`    Delivery: ${order.deliveryLocation?.address || 'Not set'}`);
      console.log(`    Created: ${new Date(order.createdAt).toLocaleDateString()}`);
    });

    return orders;
  } catch (error) {
    log.error(`Error listing orders: ${error.message}`);
    return [];
  }
};

// Delete order by ID
const deleteOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      log.error(`Order with ID "${orderId}" not found`);
      return false;
    }

    log.warning(`About to delete: Order ${order._id} (${order.quantity} units, ${order.totalPrice} RWF)`);

    await Order.findByIdAndDelete(orderId);
    log.success(`Successfully deleted order`);
    return true;
  } catch (error) {
    log.error(`Error deleting order: ${error.message}`);
    return false;
  }
};

// Delete orders by status
const deleteOrdersByStatus = async (status) => {
  try {
    const orders = await Order.find({ status });

    if (orders.length === 0) {
      log.error(`No orders found with status "${status}"`);
      return false;
    }

    log.warning(`Found ${orders.length} order(s) with status "${status}"`);

    const result = await Order.deleteMany({ status });
    log.success(`Successfully deleted ${result.deletedCount} order(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting orders: ${error.message}`);
    return false;
  }
};

// Delete multiple orders by IDs
const deleteOrdersByIds = async (ids) => {
  try {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      log.error('No valid order IDs provided');
      return false;
    }

    const orders = await Order.find({ _id: { $in: validIds } });
    log.warning(`About to delete ${orders.length} order(s):`);
    orders.forEach((o, i) => {
      console.log(`  ${i + 1}. Order ${o._id} - ${o.quantity} units`);
    });

    const result = await Order.deleteMany({ _id: { $in: validIds } });
    log.success(`Successfully deleted ${result.deletedCount} order(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting orders: ${error.message}`);
    return false;
  }
};

// Delete orders without transporter (available for pickup)
const deleteAvailableOrders = async () => {
  try {
    const orders = await Order.find({
      $or: [
        { transporterId: null },
        { transporterId: { $exists: false } }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    if (orders.length === 0) {
      log.warning('No available orders found (orders without transporter)');
      return false;
    }

    log.warning(`Found ${orders.length} available order(s):`);
    orders.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.quantity} units - ${o.totalPrice} RWF - Status: ${o.status}`);
    });

    const result = await Order.deleteMany({
      $or: [
        { transporterId: null },
        { transporterId: { $exists: false } }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    log.success(`Successfully deleted ${result.deletedCount} available order(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting available orders: ${error.message}`);
    return false;
  }
};

// Main interactive menu
const main = async () => {
  await connectDB();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - show all orders and provide instructions
    log.header('📦 Order Management - Delete Tool');
    await listAllOrders();

    console.log('\n' + colors.bright + 'Usage:' + colors.reset);
    console.log('  node src/scripts/deleteOrders.js list                      - List all orders');
    console.log('  node src/scripts/deleteOrders.js delete-id <ID>            - Delete by ID');
    console.log('  node src/scripts/deleteOrders.js delete-status <status>    - Delete by status');
    console.log('  node src/scripts/deleteOrders.js delete-available          - Delete all available orders (no transporter)');
    console.log('  node src/scripts/deleteOrders.js delete-many <ID1> <ID2>   - Delete multiple by IDs');
    console.log('\n' + colors.yellow + 'Examples:' + colors.reset);
    console.log('  node src/scripts/deleteOrders.js delete-id 507f1f77bcf86cd799439011');
    console.log('  node src/scripts/deleteOrders.js delete-status pending');
    console.log('  node src/scripts/deleteOrders.js delete-available');
    console.log('  node src/scripts/deleteOrders.js delete-many 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012\n');

    mongoose.connection.close();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      await listAllOrders();
      break;

    case 'delete-id':
      if (!args[1]) {
        log.error('Please provide an order ID');
        log.info('Usage: node src/scripts/deleteOrders.js delete-id <ID>');
      } else {
        await deleteOrderById(args[1]);
      }
      break;

    case 'delete-status':
      if (!args[1]) {
        log.error('Please provide a status (pending, accepted, in_progress, completed, cancelled)');
        log.info('Usage: node src/scripts/deleteOrders.js delete-status <status>');
      } else {
        await deleteOrdersByStatus(args[1]);
      }
      break;

    case 'delete-available':
      await deleteAvailableOrders();
      break;

    case 'delete-many':
      if (args.length < 2) {
        log.error('Please provide at least one order ID');
        log.info('Usage: node src/scripts/deleteOrders.js delete-many <ID1> <ID2> ...');
      } else {
        await deleteOrdersByIds(args.slice(1));
      }
      break;

    default:
      log.error(`Unknown command: ${command}`);
      log.info('Available commands: list, delete-id, delete-status, delete-available, delete-many');
  }

  mongoose.connection.close();
  log.info('Database connection closed');
};

// Run the script
main().catch(error => {
  log.error(`Script error: ${error.message}`);
  mongoose.connection.close();
  process.exit(1);
});
