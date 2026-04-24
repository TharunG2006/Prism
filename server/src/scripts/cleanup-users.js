// Script to delete all user accounts from DynamoDB
// Usage: node src/scripts/cleanup-users.js
require('dotenv').config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME || "PrismData";

const cleanupUsers = async () => {
  try {
    // Scan for all USER items
    const scanParams = {
      TableName: tableName,
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: { ":pk": "USER#" },
    };

    const { Items } = await docClient.send(new ScanCommand(scanParams));

    if (!Items || Items.length === 0) {
      console.log("No user accounts found to delete.");
      return;
    }

    console.log(`Found ${Items.length} user account(s). Deleting...`);

    for (const item of Items) {
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { PK: item.PK, SK: item.SK },
      }));
      console.log(`  Deleted: ${item.PK}`);
    }

    console.log("All user accounts deleted successfully.");
  } catch (err) {
    console.error("Error cleaning up users:", err);
  }
};

cleanupUsers();
