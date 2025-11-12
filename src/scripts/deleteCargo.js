const mongoose = require('mongoose');
const path = require('path');
const Crop = require('../models/crop');
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

// Display all cargo with details
const listAllCargo = async () => {
  try {
    const crops = await Crop.find().sort({ createdAt: -1 });

    if (crops.length === 0) {
      log.warning('No cargo found in database');
      return [];
    }

    log.header(`Found ${crops.length} cargo items:`);

    crops.forEach((crop, index) => {
      console.log(`\n${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${crop.name}${colors.reset}`);
      console.log(`    ID: ${colors.yellow}${crop._id}${colors.reset}`);
      console.log(`    Quantity: ${crop.quantity} ${crop.unit || 'kg'}`);
      console.log(`    Status: ${crop.status}`);
      console.log(`    Farmer ID: ${crop.farmerId}`);
      console.log(`    Transporter ID: ${crop.transporterId || 'Not assigned'}`);
      console.log(`    Pickup: ${crop.location?.address || 'Not set'}`);
      console.log(`    Delivery: ${crop.destination?.address || 'Not set'}`);
      console.log(`    Price/Unit: ${crop.pricePerUnit || 0} RWF`);
      console.log(`    Transport Fee: ${crop.shippingCost || 0} RWF`);
      console.log(`    Distance: ${crop.distance || 0} km`);
      console.log(`    Created: ${new Date(crop.createdAt).toLocaleDateString()}`);
    });

    return crops;
  } catch (error) {
    log.error(`Error listing cargo: ${error.message}`);
    return [];
  }
};

// Delete cargo by ID
const deleteCargoById = async (cargoId) => {
  try {
    const cargo = await Crop.findById(cargoId);

    if (!cargo) {
      log.error(`Cargo with ID "${cargoId}" not found`);
      return false;
    }

    log.warning(`About to delete: ${cargo.name} (${cargo.quantity} ${cargo.unit || 'kg'})`);

    await Crop.findByIdAndDelete(cargoId);
    log.success(`Successfully deleted cargo: ${cargo.name}`);
    return true;
  } catch (error) {
    log.error(`Error deleting cargo: ${error.message}`);
    return false;
  }
};

// Delete cargo by name (deletes all matching)
const deleteCargoByName = async (cargoName) => {
  try {
    const cargos = await Crop.find({ name: new RegExp(cargoName, 'i') });

    if (cargos.length === 0) {
      log.error(`No cargo found with name containing "${cargoName}"`);
      return false;
    }

    log.warning(`Found ${cargos.length} cargo(s) matching "${cargoName}":`);
    cargos.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - ${c.quantity} ${c.unit || 'kg'} (ID: ${c._id})`);
    });

    const result = await Crop.deleteMany({ name: new RegExp(cargoName, 'i') });
    log.success(`Successfully deleted ${result.deletedCount} cargo item(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting cargo: ${error.message}`);
    return false;
  }
};

// Delete all cargo with specific status
const deleteCargoByStatus = async (status) => {
  try {
    const cargos = await Crop.find({ status });

    if (cargos.length === 0) {
      log.error(`No cargo found with status "${status}"`);
      return false;
    }

    log.warning(`Found ${cargos.length} cargo(s) with status "${status}"`);

    const result = await Crop.deleteMany({ status });
    log.success(`Successfully deleted ${result.deletedCount} cargo item(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting cargo: ${error.message}`);
    return false;
  }
};

// Delete multiple cargo by IDs
const deleteManyByIds = async (ids) => {
  try {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      log.error('No valid cargo IDs provided');
      return false;
    }

    const cargos = await Crop.find({ _id: { $in: validIds } });
    log.warning(`About to delete ${cargos.length} cargo item(s):`);
    cargos.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - ${c.quantity} ${c.unit || 'kg'}`);
    });

    const result = await Crop.deleteMany({ _id: { $in: validIds } });
    log.success(`Successfully deleted ${result.deletedCount} cargo item(s)`);
    return true;
  } catch (error) {
    log.error(`Error deleting cargo: ${error.message}`);
    return false;
  }
};

// Main interactive menu
const main = async () => {
  await connectDB();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - show all cargo and provide instructions
    log.header('🚚 Cargo Management - Delete Tool');
    await listAllCargo();

    console.log('\n' + colors.bright + 'Usage:' + colors.reset);
    console.log('  node src/scripts/deleteCargo.js list                    - List all cargo');
    console.log('  node src/scripts/deleteCargo.js delete-id <ID>          - Delete by ID');
    console.log('  node src/scripts/deleteCargo.js delete-name <name>      - Delete by name (all matching)');
    console.log('  node src/scripts/deleteCargo.js delete-status <status>  - Delete by status (listed/matched/etc)');
    console.log('  node src/scripts/deleteCargo.js delete-many <ID1> <ID2> - Delete multiple by IDs');
    console.log('\n' + colors.yellow + 'Examples:' + colors.reset);
    console.log('  node src/scripts/deleteCargo.js delete-id 507f1f77bcf86cd799439011');
    console.log('  node src/scripts/deleteCargo.js delete-name "Rice"');
    console.log('  node src/scripts/deleteCargo.js delete-status listed');
    console.log('  node src/scripts/deleteCargo.js delete-many 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012\n');

    mongoose.connection.close();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      await listAllCargo();
      break;

    case 'delete-id':
      if (!args[1]) {
        log.error('Please provide a cargo ID');
        log.info('Usage: node src/scripts/deleteCargo.js delete-id <ID>');
      } else {
        await deleteCargoById(args[1]);
      }
      break;

    case 'delete-name':
      if (!args[1]) {
        log.error('Please provide a cargo name');
        log.info('Usage: node src/scripts/deleteCargo.js delete-name <name>');
      } else {
        await deleteCargoByName(args[1]);
      }
      break;

    case 'delete-status':
      if (!args[1]) {
        log.error('Please provide a status (listed, matched, picked_up, in_transit, delivered)');
        log.info('Usage: node src/scripts/deleteCargo.js delete-status <status>');
      } else {
        await deleteCargoByStatus(args[1]);
      }
      break;

    case 'delete-many':
      if (args.length < 2) {
        log.error('Please provide at least one cargo ID');
        log.info('Usage: node src/scripts/deleteCargo.js delete-many <ID1> <ID2> ...');
      } else {
        await deleteManyByIds(args.slice(1));
      }
      break;

    default:
      log.error(`Unknown command: ${command}`);
      log.info('Available commands: list, delete-id, delete-name, delete-status, delete-many');
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
