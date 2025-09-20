import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CITY_FILE = "./metadata/classificationCityList.json";
const OUTPUT_FILE = "./data/naicsDensityRescale.json";
const DELAY_MS = 100;

// get cityIds from city file
const cities = JSON.parse(fs.readFileSync(CITY_FILE));
const cityIds = cities.map(c => c.cityId);

// GraphQL query string
const QUERY = `
query GetNaicsDensityRescale(
  $cityId: Int!
  $peerGroup: String
  $partnerCityIds: [Int]
  $naicsLevel: Int = 3
  $year: Int = 2024
) {
  naicsDensityRescale(
    cityId: $cityId
    peerGroup: $peerGroup
    partnerCityIds: $partnerCityIds
    naicsLevel: $naicsLevel
    year: $year
  ) {
    cityId
    naicsId
    level
    year
    densityEmploy
    densityCompany
  }
}
`;

// Delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Replace with your GraphQL endpoint
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

async function fetchCityData(cityId) {
  const variables = {
    cityId,
    peerGroup: "global_pop",
    partnerCityIds: [],
    naicsLevel: 3,
    year: 2024
  };

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables })
  });

  const json = await res.json();
  if (json.errors) {
    console.error(`Error fetching city ${cityId}:`, json.errors);
    return null;
  }

  return json.data.naicsDensityRescale;
}

async function main() {
  const aggregated = [];

  for (let i = 0; i < cityIds.length; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${cityIds.length}] Fetching naicsDensityRescale for city ${cityId}...`);
    
    const data = await fetchCityData(cityId);

    if (data && data.length) {
      aggregated.push({ cityId, data });
      console.log(`  ✅ Added ${data.length} items for city ${cityId}`);
    } else {
      console.log(`  ⚠️ No data returned for city ${cityId}`);
    }

    await delay(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(aggregated, null, 2));
  console.log(`Saved all data to ${OUTPUT_FILE}`);
}

main().catch(console.error);
