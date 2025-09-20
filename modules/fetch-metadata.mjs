import fetch from "node-fetch";
import fs from "fs";

// GraphQL endpoint
const GRAPHQL_URL = "https://metroverse.hks.harvard.edu/graphql";

// List of queries to introspect
const queries = [
  "metadata",
  "cityPeerGroupCounts",
  "naicsDensityRescale",
  "clusterDensityRescale",
  "naicsPeerEconStruct",
  "clusterPeerEconStruct",
  "naicsRca",
  "clusterRca",
  "globalIndustryYear",
  "classificationNaicsIndustryList",
  "classificationNaicsIndustry",
  "classificationNaicsClusterList",
  "classificationNaicsCluster",
  "classificationCityList",
  "classificationCity",
  "classificationCountryList",
  "classificationCountry",
  "classificationRegionList",
  "classificationRegion",
  "naicsIndustry",
  "naicsIndustryList",
  "clusterIndustry",
  "clusterIndustryList",
  "cityIndustryYearList",
  "cityPartnerList",
  "cityPartnerEucdistScale",
  "cityClusterYearList"
];

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function introspectQuery(queryName) {
  // Introspect the query itself: get args and return type
  const introspectionQuery = {
    query: `
      {
        __schema {
          queryType {
            fields {
              name
              args {
                name
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
                defaultValue
              }
              type {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    `
  };

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(introspectionQuery)
  });

  const json = await response.json();

  // Find the query
  const field = json.data.__schema.queryType.fields.find(f => f.name === queryName);

  if (!field) return null;

  const queryInfo = {
    name: queryName,
    description: field.description || null,
    args: field.args || [],
    returnType: field.type
  };

  // If the query returns an object type (not scalar), introspect its fields
  let typeName = null;
  if (field.type.kind === "OBJECT") {
    typeName = field.type.name;
  } else if (field.type.kind === "LIST" && field.type.ofType && field.type.ofType.kind === "OBJECT") {
    typeName = field.type.ofType.name;
  }

  if (typeName) {
    // Get the fields of the return type
    const typeQuery = {
      query: `
        {
          __type(name: "${typeName}") {
            fields {
              name
              type {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      `
    };

    const typeResp = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typeQuery)
    });

    const typeJson = await typeResp.json();
    queryInfo.fields = typeJson.data.__type?.fields || [];
  } else {
    queryInfo.fields = [];
  }

  return queryInfo;
}

// MAIN
async function main() {
  const result = [];

  for (const queryName of queries) {
    console.log(`Introspecting ${queryName}...`);
    const queryInfo = await introspectQuery(queryName);
    result.push(queryInfo);

    // 1-second delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync("./_metadata/queries_with_fields.json", JSON.stringify(result, null, 2));
  console.log("Saved to queries_with_fields.json");
}

main().catch(console.error);
