const mongoose = require('mongoose');
const User = require('./src/models/User');
const dns = require('node:dns');
require('dotenv').config();

// Fix for MongoDB Atlas ECONNREFUSED on restricted networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function resetVault() {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      console.error("❌ Error: MONGODB_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📡 Connected to MongoDB...");

    const username = "Tharun G";
    console.log(`🔍 Searching for user: "${username}"...`);
    
    const result = await User.setupVaultPin(username, null);

    if (result) {
      console.log(`✅ SUCCESS: Vault PIN for "${username}" has been cleared.`);
      console.log("🔓 You can now set a new PIN in the Prism application.");
    } else {
      console.log(`⚠️  Warning: User "${username}" not found in the database.`);
      console.log("Checking all users to help you find the right one...");
      const allUsers = await User.searchByUsername("");
      console.log("Current users in DB:", allUsers.map(u => u.username));
    }
  } catch (error) {
    console.error("❌ Critical Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

resetVault();
