// fetch-cityPartnerList.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// CONFIG
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";
const OUTPUT_FILE = path.join("data", "cityPartnerList.json");

// Load cityIds
const cityListPath = path.join("metadata", "classificationCityList.json");
const cityList = JSON.parse(fs.readFileSync(cityListPath, "utf-8"));
const cityIds = cityList.map(c => c.cityId);

// GraphQL query
const QUERY = `
query GetCityPartnerList($cityId: Int, $partnerId: Int, $peerType: String) {
  cityPartnerList(cityId: $cityId, partnerId: $partnerId, peerType: $peerType) {
    cityId
    partnerId
    proximity
    eucdist
    populationFactor15
    gdppcPppFactor15
    sameRegion
    sameSubregion
    globalPopPeer
    regionalPopPeer
    globalIncomePeer
    regionalIncomePeer
    globalProximityPeer
    regionalProximityPeer
    globalEucdistPeer
    regionalEucdistPeer
    id
    __typename
  }
}
`;

// Fetch function
async function fetchCityData(cityId, variables = {}) {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { cityId, ...variables } })
    });

    if (!res.ok) {
      console.error(`❌ HTTP error for city ${cityId}: ${res.status} ${res.statusText}`);
      return null;
    }

    const text = await res.text();

    // Handle HTML error response
    if (text.startsWith("<")) {
      console.error(`❌ Non-JSON response for city ${cityId}`);
      return null;
    }

    const json = JSON.parse(text);

    if (json.errors) {
      console.error(`❌ GraphQL error for city ${cityId}:`, json.errors);
      return null;
    }

    return json.data.cityPartnerList;
  } catch (err) {
    console.error(`❌ Exception fetching city ${cityId}:`, err);
    return null;
  }
}

// Delay utility
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// MAIN
async function main() {
  const aggregated = [];
  const totalCities = cityIds.length;

  for (let i = 0; i < totalCities; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${totalCities}] Fetching cityPartnerList for city ${cityId}...`);

    const data = await fetchCityData(cityId);

    if (data && data.length > 0) {
      aggregated.push({ cityId, data });
      console.log(`   ✅ Got ${data.length} records for city ${cityId}`);
    } else {
      console.log(`   ⚠️ No data for city ${cityId}`);
    }

    await delay(100); // avoid hitting the server too fast
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(aggregated, null, 2));
  console.log(`\n💾 Saved aggregated results to ${OUTPUT_FILE}`);
}

main();
