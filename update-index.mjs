import algosearch from "algoliasearch";
import { sync } from "fumadocs-core/search/algolia";
import * as fs from "node:fs";

const content = fs.readFileSync(".next/server/app/static.json.body");

/** @type {import('fumadocs-core/search/algolia').DocumentRecord[]} **/
const indexes = JSON.parse(content.toString());

const client = algosearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
);

async function main() {
  try {
    await sync(client, {
      documents: indexes, // search indexes, can be provided by your content source too
    });
    console.log("Successfully synced search indexes");
  } catch (error) {
    console.error("Failed to sync search indexes:", error);
    process.exit(1);
  }
}

main();
