// fetch-clusterPeerEconStruct.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "json2csv";

// CONFIG
const CITY_FILE = "./metadata/classificationCityList.json";
const OUTPUT_FILE = "./data/clusterPeerEconStruct.csv";
const DELAY_MS = 100;
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

// Load cityIds
const cities = JSON.parse(fs.readFileSync(CITY_FILE));
const cityIds = cities.map(c => c.cityId);

// GraphQL query
const QUERY = `
query GetClusterPeerEconStruct(
  $cityId: Int!
  $peerGroup: String
  $partnerCityIds: [Int]
  $clusterLevel: Int = 3
  $year: Int = 2024
  $includeBaseCity: Boolean = true
) {
  clusterPeerEconStruct(
    cityId: $cityId
    peerGroup: $peerGroup
    partnerCityIds: $partnerCityIds
    clusterLevel: $clusterLevel
    year: $year
    includeBaseCity: $includeBaseCity
  ) {
    clusterId
    level
    year
    totalEmployCount
    avgEmployCount
    avgEmployShare
    totalCompanyCount
    avgCompanyCount
    avgCompanyShare
  }
}
`;

// Delay utility
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Fetch function
async function fetchCityData(cityId) {
  const variables = { cityId };
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables })
    });

    const text = await res.text();
    if (text.startsWith("<")) {
      console.error(`❌ Non-JSON response for city ${cityId}`);
      return null;
    }

    const json = JSON.parse(text);
    if (json.errors) {
      console.error(`❌ GraphQL error fetching city ${cityId}:`, json.errors);
      return null;
    }

    return json.data?.clusterPeerEconStruct ?? null;
  } catch (err) {
    console.error(`❌ Exception fetching city ${cityId}:`, err.message);
    return null;
  }
}

// MAIN
async function main() {
  // CSV setup
  const fields = [
    "cityId",
    "clusterId",
    "level",
    "year",
    "totalEmployCount",
    "avgEmployCount",
    "avgEmployShare",
    "totalCompanyCount",
    "avgCompanyCount",
    "avgCompanyShare"
  ];
  const stream = fs.createWriteStream(OUTPUT_FILE);
  stream.write(fields.join(",") + "\n"); // header

  for (let i = 0; i < cityIds.length; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${cityIds.length}] Fetching clusterPeerEconStruct for city ${cityId}...`);

    const data = await fetchCityData(cityId);

    if (data && data.length) {
      for (const row of data) {
        // include cityId for each row
        const csvRow = { cityId, ...row };
        stream.write(parse([csvRow], { fields, header: false }) + "\n");
      }
      console.log(`  ✅ Wrote ${data.length} rows for city ${cityId}`);
    } else {
      console.log(`  ⚠️ No data for city ${cityId}`);
    }

    await delay(DELAY_MS);
  }

  stream.end(() => console.log(`💾 Saved all CSV data to ${OUTPUT_FILE}`));
}

main().catch(console.error);
