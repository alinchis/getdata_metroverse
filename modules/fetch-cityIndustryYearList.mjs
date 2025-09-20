// fetch-cityIndustryYearList.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "json2csv";

// CONFIG
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";
const OUTPUT_FILE = path.join("data", "cityIndustryYearList.csv");

// Load cityIds
const cityListPath = path.join("metadata", "classificationCityList.json");
const cityList = JSON.parse(fs.readFileSync(cityListPath, "utf-8"));
const cityIds = cityList.map(c => c.cityId);

// GraphQL query
const QUERY = `
query GetCityIndustryYearList($cityId: Int, $naicsId: Int, $level: Int, $year: Int) {
  cityIndustryYearList(
    cityId: $cityId
    naicsId: $naicsId
    level: $level
    year: $year
  ) {
    cityId
    naicsId
    year
    numEmploy
    numCompany
    numEmployRaw
    numEmployImputed
    employImputed
    level
    rcaNumEmploy
    rcaNumCompany
    densityEmploy
    densityEmployPercentile
    densityEmployQuintile
    densityCompany
    densityCompanyPercentile
    densityCompanyQuintile
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
      body: JSON.stringify({
        query: QUERY,
        variables: { cityId, ...variables }
      })
    });

    if (!res.ok) {
      console.error(`❌ HTTP error for city ${cityId}: ${res.status} ${res.statusText}`);
      return null;
    }

    const text = await res.text();

    if (text.startsWith("<")) {
      console.error(`❌ Non-JSON response for city ${cityId}`);
      return null;
    }

    const json = JSON.parse(text);

    if (json.errors) {
      console.error(`❌ GraphQL error for city ${cityId}:`, json.errors);
      return null;
    }

    return json.data.cityIndustryYearList;
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
  // CSV setup
  const fields = [
    "cityId", "naicsId", "year", "numEmploy", "numCompany",
    "numEmployRaw", "numEmployImputed", "employImputed", "level",
    "rcaNumEmploy", "rcaNumCompany", "densityEmploy", "densityEmployPercentile",
    "densityEmployQuintile", "densityCompany", "densityCompanyPercentile",
    "densityCompanyQuintile", "id"
  ];
  const opts = { fields, header: true };

  const stream = fs.createWriteStream(OUTPUT_FILE);
  stream.write(fields.join(",") + "\n"); // write CSV header

  const totalCities = cityIds.length;

  for (let i = 0; i < totalCities; i++) {
    const cityId = cityIds[i];
    console.log(`[${i + 1}/${totalCities}] Fetching cityIndustryYearList for city ${cityId}...`);

    const data = await fetchCityData(cityId, { year: 2024 }); // tweak filters here

    if (data && data.length > 0) {
      for (const row of data) {
        // ensure cityId is included in each row
        const csvRow = { cityId, ...row };
        stream.write(parse([csvRow], { fields, header: false }) + "\n");
      }
      console.log(`   ✅ Wrote ${data.length} records for city ${cityId}`);
    } else {
      console.log(`   ⚠️ No data for city ${cityId}`);
    }

    await delay(100); // 100ms delay
  }

  stream.end(() => console.log(`\n💾 Saved CSV results to ${OUTPUT_FILE}`));
}

main();
