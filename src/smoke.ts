import { ConfigError, CredentialsError, loadConfig } from "./config.js";
import { YangoRetailClient } from "./client.js";

/** Live READ-ONLY smoke check: lists the retailer's stores (no writes). */
async function main(): Promise<void> {
  const client = new YangoRetailClient(loadConfig());
  const result = await client.getStores();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  // A missing token is a user error, not a bug: report it without the stack.
  const userError = err instanceof ConfigError || err instanceof CredentialsError;
  console.error("smoke failed:", userError ? err.message : err);
  process.exit(1);
});
