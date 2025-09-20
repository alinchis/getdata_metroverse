import fs from "fs";
import fetch from "node-fetch";

const CITY_FILE = "./metadata/classificationCityList.json";
const OUTPUT_FILE = "./data/naicsRca.json";
const DELAY_MS = 100;

// get cityIds from city file
const cities = JSON.parse(fs.readFileSync(CITY_FILE));
const cityIds = cities.map(c => c.cityId);

const QUERY = `
query GetNaicsRca(
  $cityId: Int!
  $variable: String = "employ"
  $peerGroup: String
  $partnerCityIds: [Int]
  $naicsLevel: Int = 3
  $year: Int = 2024
  $onlyBaseCity: Boolean = true
) {
  naicsRca(
    cityId: $cityId
    variable: $variable
    peerGroup: $peerGroup
    partnerCityIds: $partnerCityIds
    naicsLevel: $naicsLevel
    year: $year
    onlyBaseCity: $onlyBaseCity
  ) {
    cityId
    naicsId
    level
    year
    rca
    rcaLb
    rcaUb
    comparableIndustry
  }
}
`;

const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCityData(cityId) {
  const variables = {
    cityId,
    variable: "employ",
    peerGroup: "global_pop",
    partnerCityIds: [],
    naicsLevel: 3,
    year: 2024,
    onlyBaseCity: true
  };

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables })
  });

  const json = await res.json();
  if (json.errors) {
    console.error(`❌ Error fetching city ${cityId}:`, json.errors);
    return null;
  }

  return json.data.naicsRca;
}

async function main() {
  const aggregated = [];

  for (let i = 0; i < cityIds.length; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${cityIds.length}] Fetching naicsRca for city ${cityId}...`);

    const data = await fetchCityData(cityId);

    if (data && data.length) {
      aggregated.push({ cityId, data });
      console.log(`  ✅ Added ${data.length} items for city ${cityId}`);
    } else {
      console.log(`  ⚠️ No data for city ${cityId}`);
    }

    await delay(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(aggregated, null, 2));
  console.log(`💾 Saved all data to ${OUTPUT_FILE}`);
}

main().catch(console.error);
