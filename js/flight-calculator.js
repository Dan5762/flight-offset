let airports = {};
let loadedRegions = new Set();
const regions = ['north-america', 'europe', 'asia-pacific', 'middle-east-africa', 'south-america', 'oceania'];

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateCO2(distance, cabinClass, isRoundTrip) {
  let emissionFactor;
  
  if (distance < 500) {
    emissionFactor = 0.255;
  } else if (distance < 1600) {
    emissionFactor = 0.105;
  } else {
    emissionFactor = 0.139;
  }
  
  const cabinMultipliers = {
    'economy': 1.0,
    'premium': 1.6,
    'business': 2.9,
    'first': 4.0
  };
  
  const multiplier = cabinMultipliers[cabinClass] || 1.0;
  const tripMultiplier = isRoundTrip ? 2 : 1;
  
  const co2 = distance * emissionFactor * multiplier * tripMultiplier;
  
  const rfi = 1.9;
  return co2 * rfi;
}

function findAirport(input) {
  const upperInput = input.toUpperCase().trim();
  
  if (airports[upperInput]) {
    return airports[upperInput];
  }
  
  for (const [code, airport] of Object.entries(airports)) {
    if (airport.city.toUpperCase().includes(upperInput) || 
        airport.name.toUpperCase().includes(upperInput)) {
      return airport;
    }
  }
  
  return null;
}

function displayResults(distance, co2, isRoundTrip) {
  const resultsDiv = document.getElementById('results');
  const distanceResult = document.getElementById('distance-result');
  const co2Result = document.getElementById('co2-result');
  
  const displayDistance = isRoundTrip ? distance * 2 : distance;
  distanceResult.textContent = Math.round(displayDistance).toLocaleString();
  co2Result.textContent = Math.round(co2).toLocaleString();
  
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function detectUserRegion() {
  // Try to detect user's region from timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.includes('America/')) {
    return 'north-america';
  } else if (timezone.includes('Europe/') || timezone.includes('Africa/')) {
    return 'europe';
  } else if (timezone.includes('Asia/') || timezone.includes('Pacific/')) {
    return 'asia-pacific';
  } else if (timezone.includes('Australia/')) {
    return 'oceania';
  }
  
  // Default fallback
  return 'north-america';
}

async function loadRegion(region) {
  if (loadedRegions.has(region)) {
    return; // Already loaded
  }
  
  try {
    // Check localStorage cache first
    const cacheKey = `airports-${region}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const regionData = JSON.parse(cached);
      Object.assign(airports, regionData);
      loadedRegions.add(region);
      console.log(`Loaded ${region} airports from cache`);
      return;
    }
    
    // Fetch from network
    const response = await fetch(`data/airports-${region}.json`);
    if (!response.ok) throw new Error(`Failed to fetch ${region} airports`);
    
    const regionData = await response.json();
    Object.assign(airports, regionData);
    loadedRegions.add(region);
    
    // Cache in localStorage
    localStorage.setItem(cacheKey, JSON.stringify(regionData));
    console.log(`Loaded ${region} airports from network`);
    
  } catch (error) {
    console.error(`Error loading ${region} airports:`, error);
  }
}

async function loadAllRegions() {
  // Load user's primary region first
  const primaryRegion = detectUserRegion();
  await loadRegion(primaryRegion);
  
  // Load other regions in background
  const otherRegions = regions.filter(r => r !== primaryRegion);
  for (const region of otherRegions) {
    await loadRegion(region);
  }
}

async function findAirportWithRegionalLoading(input) {
  // First try to find in already loaded data
  let airport = findAirport(input);
  if (airport) return airport;
  
  // If not found, try loading more regions
  for (const region of regions) {
    if (!loadedRegions.has(region)) {
      await loadRegion(region);
      airport = findAirport(input);
      if (airport) return airport;
    }
  }
  
  return null;
}

document.addEventListener('DOMContentLoaded', async function() {
  // Load user's primary region immediately, then others in background
  const primaryRegion = detectUserRegion();
  await loadRegion(primaryRegion);
  
  // Load other regions in background
  loadAllRegions();
  const calculateBtn = document.getElementById('calculate-btn');
  
  calculateBtn.addEventListener('click', async function() {
    const departureInput = document.getElementById('departure').value;
    const arrivalInput = document.getElementById('arrival').value;
    const tripType = document.getElementById('trip-type').value;
    const cabinClass = document.getElementById('cabin-class').value;
    
    if (!departureInput || !arrivalInput) {
      alert('Please enter both departure and arrival airports');
      return;
    }
    
    const departureAirport = await findAirportWithRegionalLoading(departureInput);
    const arrivalAirport = await findAirportWithRegionalLoading(arrivalInput);
    
    if (!departureAirport) {
      alert(`Could not find airport: ${departureInput}. Try using the airport code (e.g., JFK) or city name.`);
      return;
    }
    
    if (!arrivalAirport) {
      alert(`Could not find airport: ${arrivalInput}. Try using the airport code (e.g., LHR) or city name.`);
      return;
    }
    
    const distance = calculateDistance(
      departureAirport.lat, departureAirport.lon,
      arrivalAirport.lat, arrivalAirport.lon
    );
    
    const isRoundTrip = tripType === 'round';
    const co2 = calculateCO2(distance, cabinClass, isRoundTrip);
    
    displayResults(distance, co2, isRoundTrip);
  });
});