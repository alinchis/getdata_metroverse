// fetch-clusterRca.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "json2csv";

// CONFIG
const CITY_FILE = "./metadata/classificationCityList.json";
const OUTPUT_FILE = "./data/clusterRca.csv";
const DELAY_MS = 200;
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

// Load cityIds
const cities = JSON.parse(fs.readFileSync(CITY_FILE));
const cityIds = cities.map(c => c.cityId);

// GraphQL query
const QUERY = `
query GetClusterRca(
  $cityId: Int!
  $variable: String = "employ"
  $peerGroup: String
  $partnerCityIds: [Int]
  $clusterLevel: Int = 3
  $year: Int = 2024
  $onlyBaseCity: Boolean = true
) {
  clusterRca(
    cityId: $cityId
    variable: $variable
    peerGroup: $peerGroup
    partnerCityIds: $partnerCityIds
    clusterLevel: $clusterLevel
    year: $year
    onlyBaseCity: $onlyBaseCity
  ) {
    cityId
    clusterId
    level
    year
    rca
    rcaLb
    rcaUb
    comparableIndustry
  }
}
`;

// Delay utility
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Fetch function
async function fetchWithTimeout(url, options, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function fetchCityData(cityId) {
  const variables = {
    cityId,
    variable: "employ",
    peerGroup: "global_pop",
    partnerCityIds: [],
    clusterLevel: 3,
    year: 2024,
    onlyBaseCity: true
  };

  try {
    const json = await fetchWithTimeout(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables })
    });

    if (!json) {
      console.error(`❌ No response for city ${cityId}`);
      return null;
    }

    if (json.errors) {
      console.error(`❌ GraphQL error fetching city ${cityId}:`, json.errors);
      return null;
    }

    return json.data?.clusterRca ?? null;
  } catch (err) {
    console.error(`❌ Exception fetching city ${cityId}:`, err.message);
    return null;
  }
}


// MAIN
async function main() {
  const fields = [
    "cityId",
    "clusterId",
    "level",
    "year",
    "rca",
    "rcaLb",
    "rcaUb",
    "comparableIndustry"
  ];

  const stream = fs.createWriteStream(OUTPUT_FILE);
  stream.write(fields.join(",") + "\n"); // header

  for (let i = 0; i < cityIds.length; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${cityIds.length}] Fetching clusterRca for city ${cityId}...`);

    const data = await fetchCityData(cityId);

    if (data && data.length) {
      for (const row of data) {
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
