# GET data from the Metroverse website [https://metroverse.hks.harvard.edu]

### Introspection schema
I have ran grapql introspection code:
`{
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
  }
}`

This returned a list of available queries:
`[
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
]`

Some queries require args others don't.

### Get data from queries that don't require args [ metadata folder ]
In order to run the download code, move to project folder and follow the steps below:
1. Run `node ./modules/fetch-metadata.mjs`. This code gets the fields and args for the available graphql queries, and saves them in `./_metadata/queries_with_fields.json` file.
2. Run `node ./modules/fetch-no-args-data.mjs`. This code runs all the graphql queries, that don't require args, and saves the returned data in `./metadata/<query-name>.json`.

### Get data from queries that require args (usually cityId) [ data folder ]
3. Run `node ./modules/<query-name>.mjs`. This code runs all the graphql queris, that require 'cityId' arg, and saves all the data on a query basis in `./data/<query-name>.json`.
Queries available: [   "cityPeerGroupCounts", "naicsDensityRescale", "clusterDensityRescale", "naicsPeerEconStruct", "clusterPeerEconStruct", "naicsRca", "clusterRca", "globalIndustryYear", "cityIndustryYearList", "cityPartnerList", "cityPartnerEucdistScale", "cityClusterYearList" ]

#### NOTE:
For the queries [ "cityIndustryYearList", "clusterRca", "clusterPeerEconStruct" ], the data gets too large, I saved it in CSV format.

### Excluded queris
This queries are for one item, already available in the list query data: [  "classificationNaicsIndustry", "classificationNaicsCluster", "classificationCity", "classificationCountry", "classificationRegion", "naicsIndustry", "clusterIndustry",]