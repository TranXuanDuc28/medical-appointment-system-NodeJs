const { PayOS } = require("@payos/node");
require("dotenv").config();

let payOS = null;

const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

if (clientId && apiKey && checksumKey) {
  try {
    payOS = new PayOS({
      clientId: clientId.trim(),
      apiKey: apiKey.trim(),
      checksumKey: checksumKey.trim(),
    });
    console.log("✅ PayOS initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing PayOS:", error.message);
  }
} else {
  console.log(
    "⚠️ PayOS credentials not fully configured in .env (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY)"
  );
}

module.exports = payOS;
