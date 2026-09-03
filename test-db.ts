import { connectToDatabase } from "./lib/mongodb";

async function main() {
  console.log("Testing MongoDB connection...");
  const result = await connectToDatabase();
  console.log("Connection result:", result);
  process.exit(result.isConnected ? 0 : 1);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
