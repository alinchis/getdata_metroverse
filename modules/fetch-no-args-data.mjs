import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// Ensure the folder exists
const folder = path.join(".", "metadata");
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder);
}

const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load Stage 1 JSON
const introspection = JSON.parse(fs.readFileSync("./_metadata/queries_with_fields.json", "utf-8"));

// Helper to build query string
// function buildQuery(queryInfo) {
//   if (!queryInfo.fields || queryInfo.fields.length === 0) return null;

//   const fieldList = queryInfo.fields.map(f => f.name).join("\n    ");

//   return `
//     query {
//       ${queryInfo.name} {
//         ${fieldList}
//       }
//     }
//   `;
// }

// Build query string, skipping object/connection fields
function buildQuery(queryInfo) {
  if (!queryInfo.fields || queryInfo.fields.length === 0) return null;

  // Only include SCALAR or ID fields
  const scalarFields = queryInfo.fields.filter(f => {
    const kind = f.type.kind;
    const ofKind = f.type.ofType?.kind;
    return kind === "SCALAR" || kind === "ID" || ofKind === "SCALAR" || ofKind === "ID";
  });

  if (scalarFields.length === 0) return null;

  const fieldList = scalarFields.map(f => f.name).join("\n    ");

  return `
    query {
      ${queryInfo.name} {
        ${fieldList}
      }
    }
  `;
}


async function fetchQueryData(queryInfo) {
  const queryStr = buildQuery(queryInfo);
  if (!queryStr) return null;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryStr })
    });

    const json = await response.json();
    return json.data?.[queryInfo.name] || null;
  } catch (err) {
    console.error(`Error fetching ${queryInfo.name}:`, err);
    return null;
  }
}

// MAIN
async function main() {
  for (const queryInfo of introspection) {
    console.log(`\n Query Name: ${queryInfo.name}`);
    // Skip queries with required args
    const hasRequiredArgs = queryInfo.args?.some(arg => arg.type.kind === "NON_NULL");

    // Skip if requires args
    if (hasRequiredArgs) {
      console.log(`\t>> Skipping: requires args`);
      continue;
    }

    // Skip if file already exists
    const filename = path.join(folder, `${queryInfo.name}.json`);
    if (fs.existsSync(filename)) {
      console.log(`\t>> Skipping: download file already exists`);
      continue;
    }

    console.log(`Fetching data for ${queryInfo.name}...`);
    const data = await fetchQueryData(queryInfo);

    // Save to JSON file
    if (data !== null) {
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Saved ${filename}`);
    } else {
      console.log(`No data returned for ${queryInfo.name}`);
    }

    // 1-second delay between requests
    await delay(1000);
  }
}

main().catch(console.error);
