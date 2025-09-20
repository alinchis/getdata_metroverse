import fs from "fs";
import fetch from "node-fetch";

const OUTPUT_FILE = "./data/globalIndustryYear.json";

const QUERY = `
query GetGlobalIndustryYear($level: Int!, $year: Int!) {
  globalIndustryYear(level: $level, year: $year) {
    naicsId
    naicsIdTopParent
    year
    level
    sumNumCompany
    sumNumEmploy
    avgNumCompany
    avgNumEmploy
  }
}
`;

const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

async function fetchGlobalIndustryYear(level, year) {
  const variables = { level, year };

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables })
  });

  const json = await res.json();
  if (json.errors) {
    console.error("❌ Error:", json.errors);
    return null;
  }
  return json.data.globalIndustryYear;
}

async function main() {
  console.log(`📡 Fetching globalIndustryYear (level=6, year=2024)...`);

  const data = await fetchGlobalIndustryYear(6, 2024);

  if (data && data.length) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${data.length} records to ${OUTPUT_FILE}`);
  } else {
    console.log("⚠️ No data returned");
  }
}

main().catch(console.error);