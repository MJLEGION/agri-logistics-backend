const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Crop = require('./src/models/crop');
const Transporter = require('./src/models/transporter');
const User = require('./src/models/user');

async function debugAvailableCargo() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get all listed cargo
    const allCargo = await Crop.find({ status: 'listed' })
      .populate('farmerId', 'name phone')
      .lean();

    console.log('📦 LISTED CARGO:');
    console.log(`Total: ${allCargo.length}\n`);

    if (allCargo.length > 0) {
      allCargo.forEach((cargo, index) => {
        console.log(`${index + 1}. ${cargo.name}`);
        console.log(`   Quantity: ${cargo.quantity} ${cargo.unit}`);
        console.log(`   Price: ${cargo.pricePerUnit} per ${cargo.unit}`);
        console.log(`   Status: ${cargo.status}`);
        console.log(`   Farmer: ${cargo.farmerId?.name || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('   No cargo with status "listed" found\n');
    }

    // Get all transporters
    const allTransporters = await Transporter.find()
      .populate('userId', 'name phone role')
      .lean();

    console.log('\n🚛 TRANSPORTERS:');
    console.log(`Total: ${allTransporters.length}\n`);

    if (allTransporters.length > 0) {
      allTransporters.forEach((transporter, index) => {
        console.log(`${index + 1}. ${transporter.userId?.name || 'Unknown'}`);
        console.log(`   Vehicle: ${transporter.vehicle_type}`);
        console.log(`   Capacity: ${transporter.capacity} kg`);
        console.log(`   Available: ${transporter.available}`);
        console.log(`   User Role: ${transporter.userId?.role || 'Unknown'}`);

        // Check which cargo this transporter can carry
        const compatibleCargo = allCargo.filter(c => c.quantity <= transporter.capacity);
        console.log(`   Compatible cargo: ${compatibleCargo.length} of ${allCargo.length}`);

        if (compatibleCargo.length > 0) {
          console.log(`   Can carry:`);
          compatibleCargo.forEach(c => {
            console.log(`      - ${c.name} (${c.quantity} ${c.unit})`);
          });
        }
        console.log('');
      });
    } else {
      console.log('   No transporter profiles found\n');
    }

    // Analysis
    console.log('\n📊 ANALYSIS:');

    if (allCargo.length === 0) {
      console.log('❌ Issue: No cargo with status "listed" exists');
      console.log('   Solution: Make sure cargo is created with status "listed"');
    } else {
      console.log(`✅ ${allCargo.length} cargo items are available`);
    }

    if (allTransporters.length === 0) {
      console.log('❌ Issue: No transporter profiles exist');
      console.log('   Solution: Transporters need to create a profile first');
      console.log('   Endpoint: POST /api/transporters/profile/me');
    } else {
      console.log(`✅ ${allTransporters.length} transporter profiles exist`);

      // Check capacity issues
      const transportersWithIssues = allTransporters.filter(t => {
        const compatibleCargo = allCargo.filter(c => c.quantity <= t.capacity);
        return compatibleCargo.length === 0 && allCargo.length > 0;
      });

      if (transportersWithIssues.length > 0) {
        console.log(`⚠️  ${transportersWithIssues.length} transporter(s) have capacity smaller than all available cargo`);
        console.log('   Solution: Either increase transporter capacity or create smaller cargo items');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAvailableCargo();
