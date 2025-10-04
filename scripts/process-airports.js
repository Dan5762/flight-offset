const fs = require('fs');
const path = require('path');

// Read the downloaded airports data
const airportsData = JSON.parse(fs.readFileSync('/tmp/airports.json', 'utf8'));

// Regional mappings based on country codes
const regions = {
  'north-america': ['US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'PR', 'TT', 'BB', 'GD', 'VC', 'LC', 'DM', 'AG', 'KN', 'BS', 'VG', 'VI', 'AI', 'MS', 'KY', 'TC', 'BM'],
  'europe': ['GB', 'IE', 'FR', 'ES', 'PT', 'IT', 'DE', 'NL', 'BE', 'LU', 'CH', 'AT', 'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'AL', 'BG', 'RO', 'MD', 'UA', 'BY', 'LT', 'LV', 'EE', 'RU', 'GR', 'CY', 'MT', 'TR'],
  'asia-pacific': ['CN', 'JP', 'KR', 'KP', 'MN', 'TW', 'HK', 'MO', 'TH', 'VN', 'LA', 'KH', 'MM', 'MY', 'SG', 'BN', 'ID', 'TL', 'PH', 'IN', 'PK', 'BD', 'LK', 'MV', 'NP', 'BT', 'AF', 'IR', 'IQ', 'SY', 'LB', 'JO', 'IL', 'PS', 'CY', 'AM', 'AZ', 'GE', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'AU', 'NZ', 'PG', 'FJ', 'NC', 'VU', 'SB', 'TO', 'WS', 'KI', 'TV', 'NR', 'PW', 'FM', 'MH'],
  'middle-east-africa': ['SA', 'AE', 'QA', 'BH', 'KW', 'OM', 'YE', 'EG', 'LY', 'TN', 'DZ', 'MA', 'EH', 'MR', 'ML', 'NE', 'TD', 'SD', 'SS', 'ER', 'ET', 'DJ', 'SO', 'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CF', 'CM', 'GQ', 'GA', 'CG', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'LS', 'SZ', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE'],
  'south-america': ['BR', 'AR', 'CL', 'PE', 'BO', 'PY', 'UY', 'VE', 'CO', 'EC', 'GY', 'SR', 'GF'],
  'oceania': ['AU', 'NZ', 'PG', 'FJ', 'NC', 'VU', 'SB', 'TO', 'WS', 'KI', 'TV', 'NR', 'PW', 'FM', 'MH', 'AS', 'GU', 'MP', 'CK', 'NU', 'TK', 'WF', 'PF']
};

// Initialize regional data structures
const regionalAirports = {
  'north-america': {},
  'europe': {},
  'asia-pacific': {},
  'middle-east-africa': {},
  'south-america': {},
  'oceania': {}
};

// Filter criteria for commercial airports
function isCommercialAirport(airport) {
  // Only include airports with IATA codes (standard for commercial passenger airports)
  return airport.iata && airport.iata.length === 3;
}

// Function to determine region for a country
function getRegion(country) {
  for (const [region, countries] of Object.entries(regions)) {
    if (countries.includes(country)) {
      return region;
    }
  }
  return 'asia-pacific'; // Default for unmatched countries
}

// Process airports
let totalProcessed = 0;
let commercialCount = 0;

for (const [icao, airport] of Object.entries(airportsData)) {
  totalProcessed++;
  
  if (isCommercialAirport(airport)) {
    commercialCount++;
    const region = getRegion(airport.country);
    
    // Store by IATA code only (all filtered airports have IATA codes)
    regionalAirports[region][airport.iata] = {
      name: airport.name,
      city: airport.city,
      country: airport.country,
      lat: airport.lat,
      lon: airport.lon
    };
  }
}

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write regional files
for (const [region, airports] of Object.entries(regionalAirports)) {
  const filename = `airports-${region}.json`;
  const filepath = path.join(dataDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(airports, null, 2));
  
  const airportCount = Object.keys(airports).length;
  const fileSize = fs.statSync(filepath).size;
  console.log(`${filename}: ${airportCount} airports, ${(fileSize / 1024).toFixed(1)}KB`);
}

console.log(`\nProcessing complete:`);
console.log(`Total airports processed: ${totalProcessed}`);
console.log(`Commercial airports extracted: ${commercialCount}`);
console.log(`Filtered out: ${totalProcessed - commercialCount} non-commercial airports`);