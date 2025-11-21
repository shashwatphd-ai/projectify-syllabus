/**
 * Geographic Distance Calculation Utility
 *
 * Provides Haversine formula-based distance calculation between two geographic points.
 * Used for proximity-based company sorting in discovery pipeline.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationParseResult {
  success: boolean;
  coordinates?: GeoCoordinates;
  location: string;
  error?: string;
}

/**
 * Known city coordinates for common locations worldwide
 * Used as fallback when geocoding API is unavailable
 * Prioritizes: University cities, major metros, tech hubs, business centers
 */
const KNOWN_LOCATIONS: Record<string, GeoCoordinates> = {
  // ========================================
  // US - Major Cities
  // ========================================
  'boston, massachusetts': { latitude: 42.3601, longitude: -71.0589 },
  'cambridge, massachusetts': { latitude: 42.3736, longitude: -71.1097 },
  'new york, new york': { latitude: 40.7128, longitude: -74.0060 },
  'san francisco, california': { latitude: 37.7749, longitude: -122.4194 },
  'los angeles, california': { latitude: 34.0522, longitude: -118.2437 },
  'chicago, illinois': { latitude: 41.8781, longitude: -87.6298 },
  'seattle, washington': { latitude: 47.6062, longitude: -122.3321 },
  'austin, texas': { latitude: 30.2672, longitude: -97.7431 },
  'denver, colorado': { latitude: 39.7392, longitude: -104.9903 },
  'portland, oregon': { latitude: 45.5152, longitude: -122.6784 },
  'miami, florida': { latitude: 25.7617, longitude: -80.1918 },
  'atlanta, georgia': { latitude: 33.7490, longitude: -84.3880 },
  'dallas, texas': { latitude: 32.7767, longitude: -96.7970 },
  'houston, texas': { latitude: 29.7604, longitude: -95.3698 },
  'philadelphia, pennsylvania': { latitude: 39.9526, longitude: -75.1652 },
  'phoenix, arizona': { latitude: 33.4484, longitude: -112.0740 },
  'san diego, california': { latitude: 32.7157, longitude: -117.1611 },
  'detroit, michigan': { latitude: 42.3314, longitude: -83.0458 },
  'minneapolis, minnesota': { latitude: 44.9778, longitude: -93.2650 },
  'washington, district of columbia': { latitude: 38.9072, longitude: -77.0369 },
  'columbus, ohio': { latitude: 39.9612, longitude: -82.9988 },
  'kansas city, missouri': { latitude: 39.0997, longitude: -94.5786 },
  'kansas city, kansas': { latitude: 39.1142, longitude: -94.6275 },
  'pittsburgh, pennsylvania': { latitude: 40.4406, longitude: -79.9959 },
  'cleveland, ohio': { latitude: 41.4993, longitude: -81.6944 },
  'nashville, tennessee': { latitude: 36.1627, longitude: -86.7816 },
  'indianapolis, indiana': { latitude: 39.7684, longitude: -86.1581 },
  'charlotte, north carolina': { latitude: 35.2271, longitude: -80.8431 },
  'raleigh, north carolina': { latitude: 35.7796, longitude: -78.6382 },
  'baltimore, maryland': { latitude: 39.2904, longitude: -76.6122 },
  'milwaukee, wisconsin': { latitude: 43.0389, longitude: -87.9065 },
  'salt lake city, utah': { latitude: 40.7608, longitude: -111.8910 },

  // ========================================
  // US - University Cities & College Towns
  // ========================================
  'ann arbor, michigan': { latitude: 42.2808, longitude: -83.7430 },
  'berkeley, california': { latitude: 37.8715, longitude: -122.2730 },
  'stanford, california': { latitude: 37.4275, longitude: -122.1697 },
  'palo alto, california': { latitude: 37.4419, longitude: -122.1430 },
  'ithaca, new york': { latitude: 42.4440, longitude: -76.5019 },
  'durham, north carolina': { latitude: 35.9940, longitude: -78.8986 },
  'chapel hill, north carolina': { latitude: 35.9132, longitude: -79.0558 },
  'princeton, new jersey': { latitude: 40.3573, longitude: -74.6672 },
  'new haven, connecticut': { latitude: 41.3083, longitude: -72.9279 },
  'providence, rhode island': { latitude: 41.8240, longitude: -71.4128 },
  'evanston, illinois': { latitude: 42.0451, longitude: -87.6877 },
  'bloomington, indiana': { latitude: 39.1653, longitude: -86.5264 },
  'college station, texas': { latitude: 30.6280, longitude: -96.3344 },
  'charlottesville, virginia': { latitude: 38.0293, longitude: -78.4767 },
  'urbana, illinois': { latitude: 40.1106, longitude: -88.2073 },
  'champaign, illinois': { latitude: 40.1164, longitude: -88.2434 },
  'madison, wisconsin': { latitude: 43.0731, longitude: -89.4012 },
  'west lafayette, indiana': { latitude: 40.4259, longitude: -86.9081 },
  'state college, pennsylvania': { latitude: 40.7934, longitude: -77.8600 },
  'gainesville, florida': { latitude: 29.6516, longitude: -82.3248 },
  'tallahassee, florida': { latitude: 30.4383, longitude: -84.2807 },

  // ========================================
  // US - Tech Hubs & Business Centers
  // ========================================
  'san jose, california': { latitude: 37.3382, longitude: -121.8863 },
  'mountain view, california': { latitude: 37.3861, longitude: -122.0839 },
  'sunnyvale, california': { latitude: 37.3688, longitude: -122.0363 },
  'cupertino, california': { latitude: 37.3230, longitude: -122.0322 },
  'santa clara, california': { latitude: 37.3541, longitude: -121.9552 },
  'redmond, washington': { latitude: 47.6740, longitude: -122.1215 },
  'bellevue, washington': { latitude: 47.6101, longitude: -122.2015 },
  'reston, virginia': { latitude: 38.9586, longitude: -77.3570 },
  'arlington, virginia': { latitude: 38.8816, longitude: -77.0910 },
  'plano, texas': { latitude: 33.0198, longitude: -96.6989 },
  'irvine, california': { latitude: 33.6846, longitude: -117.8265 },

  // ========================================
  // US - Additional Metro Areas
  // ========================================
  'st. louis, missouri': { latitude: 38.6270, longitude: -90.1994 },
  'omaha, nebraska': { latitude: 41.2565, longitude: -95.9345 },
  'buffalo, new york': { latitude: 42.8864, longitude: -78.8784 },
  'rochester, new york': { latitude: 43.1566, longitude: -77.6088 },
  'syracuse, new york': { latitude: 43.0481, longitude: -76.1474 },
  'albany, new york': { latitude: 42.6526, longitude: -73.7562 },
  'louisville, kentucky': { latitude: 38.2527, longitude: -85.7585 },
  'memphis, tennessee': { latitude: 35.1495, longitude: -90.0490 },
  'new orleans, louisiana': { latitude: 29.9511, longitude: -90.0715 },
  'baton rouge, louisiana': { latitude: 30.4515, longitude: -91.1871 },
  'oklahoma city, oklahoma': { latitude: 35.4676, longitude: -97.5164 },
  'tulsa, oklahoma': { latitude: 36.1539, longitude: -95.9928 },
  'albuquerque, new mexico': { latitude: 35.0844, longitude: -106.6504 },
  'tucson, arizona': { latitude: 32.2226, longitude: -110.9747 },
  'las vegas, nevada': { latitude: 36.1699, longitude: -115.1398 },
  'reno, nevada': { latitude: 39.5296, longitude: -119.8138 },
  'boise, idaho': { latitude: 43.6150, longitude: -116.2023 },
  'sacramento, california': { latitude: 38.5816, longitude: -121.4944 },
  'fresno, california': { latitude: 36.7378, longitude: -119.7871 },
  'oakland, california': { latitude: 37.8044, longitude: -122.2712 },
  'riverside, california': { latitude: 33.9533, longitude: -117.3962 },
  'tampa, florida': { latitude: 27.9506, longitude: -82.4572 },
  'orlando, florida': { latitude: 28.5383, longitude: -81.3792 },
  'jacksonville, florida': { latitude: 30.3322, longitude: -81.6557 },
  'fort lauderdale, florida': { latitude: 26.1224, longitude: -80.1373 },

  // ========================================
  // INTERNATIONAL - Canada
  // ========================================
  'toronto, ontario': { latitude: 43.6532, longitude: -79.3832 },
  'toronto, canada': { latitude: 43.6532, longitude: -79.3832 },
  'vancouver, british columbia': { latitude: 49.2827, longitude: -123.1207 },
  'vancouver, canada': { latitude: 49.2827, longitude: -123.1207 },
  'montreal, quebec': { latitude: 45.5017, longitude: -73.5673 },
  'montreal, canada': { latitude: 45.5017, longitude: -73.5673 },
  'ottawa, ontario': { latitude: 45.4215, longitude: -75.6972 },
  'ottawa, canada': { latitude: 45.4215, longitude: -75.6972 },
  'calgary, alberta': { latitude: 51.0447, longitude: -114.0719 },
  'calgary, canada': { latitude: 51.0447, longitude: -114.0719 },
  'edmonton, alberta': { latitude: 53.5461, longitude: -113.4938 },
  'waterloo, ontario': { latitude: 43.4643, longitude: -80.5204 },

  // ========================================
  // INTERNATIONAL - United Kingdom
  // ========================================
  'london, england': { latitude: 51.5074, longitude: -0.1278 },
  'london, united kingdom': { latitude: 51.5074, longitude: -0.1278 },
  'london, uk': { latitude: 51.5074, longitude: -0.1278 },
  'cambridge, england': { latitude: 52.2053, longitude: 0.1218 },
  'cambridge, united kingdom': { latitude: 52.2053, longitude: 0.1218 },
  'oxford, england': { latitude: 51.7520, longitude: -1.2577 },
  'oxford, united kingdom': { latitude: 51.7520, longitude: -1.2577 },
  'manchester, england': { latitude: 53.4808, longitude: -2.2426 },
  'manchester, united kingdom': { latitude: 53.4808, longitude: -2.2426 },
  'edinburgh, scotland': { latitude: 55.9533, longitude: -3.1883 },
  'edinburgh, united kingdom': { latitude: 55.9533, longitude: -3.1883 },
  'glasgow, scotland': { latitude: 55.8642, longitude: -4.2518 },
  'birmingham, england': { latitude: 52.4862, longitude: -1.8904 },
  'bristol, england': { latitude: 51.4545, longitude: -2.5879 },

  // ========================================
  // INTERNATIONAL - Australia
  // ========================================
  'sydney, australia': { latitude: -33.8688, longitude: 151.2093 },
  'sydney, new south wales': { latitude: -33.8688, longitude: 151.2093 },
  'melbourne, australia': { latitude: -37.8136, longitude: 144.9631 },
  'melbourne, victoria': { latitude: -37.8136, longitude: 144.9631 },
  'brisbane, australia': { latitude: -27.4698, longitude: 153.0251 },
  'brisbane, queensland': { latitude: -27.4698, longitude: 153.0251 },
  'perth, australia': { latitude: -31.9505, longitude: 115.8605 },
  'perth, western australia': { latitude: -31.9505, longitude: 115.8605 },
  'adelaide, australia': { latitude: -34.9285, longitude: 138.6007 },
  'canberra, australia': { latitude: -35.2809, longitude: 149.1300 },

  // ========================================
  // INTERNATIONAL - India
  // ========================================
  'bangalore, india': { latitude: 12.9716, longitude: 77.5946 },
  'bengaluru, india': { latitude: 12.9716, longitude: 77.5946 },
  'mumbai, india': { latitude: 19.0760, longitude: 72.8777 },
  'delhi, india': { latitude: 28.7041, longitude: 77.1025 },
  'new delhi, india': { latitude: 28.6139, longitude: 77.2090 },
  'hyderabad, india': { latitude: 17.3850, longitude: 78.4867 },
  'chennai, india': { latitude: 13.0827, longitude: 80.2707 },
  'pune, india': { latitude: 18.5204, longitude: 73.8567 },
  'kolkata, india': { latitude: 22.5726, longitude: 88.3639 },
  'ahmedabad, india': { latitude: 23.0225, longitude: 72.5714 },

  // ========================================
  // INTERNATIONAL - Other Major Cities
  // ========================================
  'singapore': { latitude: 1.3521, longitude: 103.8198 },
  'singapore, singapore': { latitude: 1.3521, longitude: 103.8198 },
  'dublin, ireland': { latitude: 53.3498, longitude: -6.2603 },
  'amsterdam, netherlands': { latitude: 52.3676, longitude: 4.9041 },
  'berlin, germany': { latitude: 52.5200, longitude: 13.4050 },
  'munich, germany': { latitude: 48.1351, longitude: 11.5820 },
  'paris, france': { latitude: 48.8566, longitude: 2.3522 },
  'zurich, switzerland': { latitude: 47.3769, longitude: 8.5417 },
  'stockholm, sweden': { latitude: 59.3293, longitude: 18.0686 },
  'copenhagen, denmark': { latitude: 55.6761, longitude: 12.5683 },
  'oslo, norway': { latitude: 59.9139, longitude: 10.7522 },
  'helsinki, finland': { latitude: 60.1699, longitude: 24.9384 },
  'tokyo, japan': { latitude: 35.6762, longitude: 139.6503 },
  'seoul, south korea': { latitude: 37.5665, longitude: 126.9780 },
  'shanghai, china': { latitude: 31.2304, longitude: 121.4737 },
  'beijing, china': { latitude: 39.9042, longitude: 116.4074 },
  'hong kong': { latitude: 22.3193, longitude: 114.1694 },
  'dubai, united arab emirates': { latitude: 25.2048, longitude: 55.2708 },
  'tel aviv, israel': { latitude: 32.0853, longitude: 34.7818 },
  'mexico city, mexico': { latitude: 19.4326, longitude: -99.1332 },
  'buenos aires, argentina': { latitude: -34.6037, longitude: -58.3816 },
  'sao paulo, brazil': { latitude: -23.5505, longitude: -46.6333 },

  // ========================================
  // US State-Level Fallbacks (Geographic Center)
  // ========================================
  'massachusetts': { latitude: 42.4072, longitude: -71.3824 },
  'california': { latitude: 36.7783, longitude: -119.4179 },
  'new york': { latitude: 42.1657, longitude: -74.9481 },
  'texas': { latitude: 31.9686, longitude: -99.9018 },
  'florida': { latitude: 27.6648, longitude: -81.5158 },
  'illinois': { latitude: 40.6331, longitude: -89.3985 },
  'pennsylvania': { latitude: 41.2033, longitude: -77.1945 },
  'ohio': { latitude: 40.4173, longitude: -82.9071 },
  'georgia': { latitude: 32.1656, longitude: -82.9001 },
  'north carolina': { latitude: 35.7596, longitude: -79.0193 },
  'michigan': { latitude: 44.3148, longitude: -85.6024 },
  'washington': { latitude: 47.7511, longitude: -120.7401 },
  'colorado': { latitude: 39.5501, longitude: -105.7821 },
  'oregon': { latitude: 43.8041, longitude: -120.5542 },
  'arizona': { latitude: 34.0489, longitude: -111.0937 },
  'tennessee': { latitude: 35.5175, longitude: -86.5804 },
  'missouri': { latitude: 37.9643, longitude: -91.8318 },
  'maryland': { latitude: 39.0458, longitude: -76.6413 },
  'wisconsin': { latitude: 43.7844, longitude: -88.7879 },
  'minnesota': { latitude: 46.7296, longitude: -94.6859 },
  'indiana': { latitude: 40.2672, longitude: -86.1349 },
  'utah': { latitude: 39.3210, longitude: -111.0937 },
  'kansas': { latitude: 39.0119, longitude: -98.4842 },
  'nevada': { latitude: 38.8026, longitude: -116.4194 },
  'virginia': { latitude: 37.4316, longitude: -78.6569 },
  'connecticut': { latitude: 41.6032, longitude: -73.0877 },
  'new jersey': { latitude: 40.0583, longitude: -74.4057 },
  'rhode island': { latitude: 41.5801, longitude: -71.4774 },
  'kentucky': { latitude: 37.8393, longitude: -84.2700 },
  'louisiana': { latitude: 30.9843, longitude: -91.9623 },
  'oklahoma': { latitude: 35.0078, longitude: -97.0929 },
  'new mexico': { latitude: 34.5199, longitude: -105.8701 },
  'idaho': { latitude: 44.0682, longitude: -114.7420 },
  'nebraska': { latitude: 41.4925, longitude: -99.9018 },
  'alabama': { latitude: 32.3182, longitude: -86.9023 },
  'south carolina': { latitude: 33.8361, longitude: -81.1637 },

  // ========================================
  // Common Abbreviations (US)
  // ========================================
  'boston, ma': { latitude: 42.3601, longitude: -71.0589 },
  'new york, ny': { latitude: 40.7128, longitude: -74.0060 },
  'san francisco, ca': { latitude: 37.7749, longitude: -122.4194 },
  'los angeles, ca': { latitude: 34.0522, longitude: -118.2437 },
  'chicago, il': { latitude: 41.8781, longitude: -87.6298 },
  'seattle, wa': { latitude: 47.6062, longitude: -122.3321 },
  'austin, tx': { latitude: 30.2672, longitude: -97.7431 },
  'denver, co': { latitude: 39.7392, longitude: -104.9903 },
  'miami, fl': { latitude: 25.7617, longitude: -80.1918 },
  'atlanta, ga': { latitude: 33.7490, longitude: -84.3880 },
  'philadelphia, pa': { latitude: 39.9526, longitude: -75.1652 },
  'kansas city, mo': { latitude: 39.0997, longitude: -94.5786 },
  'columbus, oh': { latitude: 39.9612, longitude: -82.9988 },

  // ========================================
  // Country-Level Fallbacks
  // ========================================
  'united states': { latitude: 37.0902, longitude: -95.7129 },
  'usa': { latitude: 37.0902, longitude: -95.7129 },
  'canada': { latitude: 56.1304, longitude: -106.3468 },
  'united kingdom': { latitude: 55.3781, longitude: -3.4360 },
  'uk': { latitude: 55.3781, longitude: -3.4360 },
  'australia': { latitude: -25.2744, longitude: 133.7751 },
  'india': { latitude: 20.5937, longitude: 78.9629 },
  'germany': { latitude: 51.1657, longitude: 10.4515 },
  'france': { latitude: 46.2276, longitude: 2.2137 },
  'japan': { latitude: 36.2048, longitude: 138.2529 },
  'china': { latitude: 35.8617, longitude: 104.1954 },
};

/**
 * Parse location string to coordinates
 * Tries known locations first, falls back to approximate parsing
 */
export function parseLocationToCoordinates(location: string): LocationParseResult {
  if (!location || location.trim().length === 0) {
    return {
      success: false,
      location,
      error: 'Empty location string'
    };
  }

  const normalizedLocation = location.toLowerCase().trim();

  // Check known locations
  if (KNOWN_LOCATIONS[normalizedLocation]) {
    return {
      success: true,
      coordinates: KNOWN_LOCATIONS[normalizedLocation],
      location
    };
  }

  // Try partial matches (e.g., "Boston, MA, USA" matches "boston, massachusetts")
  for (const key in KNOWN_LOCATIONS) {
    if (KNOWN_LOCATIONS.hasOwnProperty(key)) {
      const coords = KNOWN_LOCATIONS[key];
      if (normalizedLocation.indexOf(key) !== -1 || key.indexOf(normalizedLocation) !== -1) {
        console.log(`🗺️ Partial location match: "${location}" → "${key}"`);
        return {
          success: true,
          coordinates: coords,
          location
        };
      }
    }
  }

  // Try splitting by comma and matching parts
  const parts = normalizedLocation.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Try "City, State" pattern
    const cityState = `${parts[0]}, ${parts[1]}`;
    if (KNOWN_LOCATIONS[cityState]) {
      return {
        success: true,
        coordinates: KNOWN_LOCATIONS[cityState],
        location
      };
    }

    // Try just state
    if (KNOWN_LOCATIONS[parts[1]]) {
      console.log(`🗺️ Using state-level coordinates for: ${location} → ${parts[1]}`);
      return {
        success: true,
        coordinates: KNOWN_LOCATIONS[parts[1]],
        location
      };
    }
  }

  // Last resort: try just the first part
  if (parts.length > 0 && KNOWN_LOCATIONS[parts[0]]) {
    return {
      success: true,
      coordinates: KNOWN_LOCATIONS[parts[0]],
      location
    };
  }

  return {
    success: false,
    location,
    error: `Unknown location: ${location}`
  };
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 *
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in miles
 */
export function calculateDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 3958.8; // Earth's radius in miles

  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLonRad = toRadians(coord2.longitude - coord1.longitude);

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate distance between two location strings
 *
 * @param location1 First location string (e.g., "Boston, MA")
 * @param location2 Second location string (e.g., "New York, NY")
 * @returns Distance in miles, or null if locations cannot be parsed
 */
export function calculateDistanceBetweenLocations(
  location1: string,
  location2: string
): number | null {
  const parse1 = parseLocationToCoordinates(location1);
  const parse2 = parseLocationToCoordinates(location2);

  if (!parse1.success || !parse2.success) {
    console.warn(`⚠️ Could not calculate distance: ${parse1.error || parse2.error}`);
    return null;
  }

  return calculateDistance(parse1.coordinates!, parse2.coordinates!);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number | null): string {
  if (miles === null) {
    return 'Unknown';
  }

  if (miles < 1) {
    return '<1 mile';
  }

  return `${miles.toFixed(1)} miles`;
}

/**
 * Get diagnostic information about location parsing
 * Useful for debugging why a location couldn't be matched
 */
export function getLocationDiagnostics(location: string): {
  normalized: string;
  parts: string[];
  exactMatch: boolean;
  partialMatches: string[];
  cityStateMatch: string | null;
  stateMatch: string | null;
  suggestions: string[];
  totalKnownLocations: number;
} {
  const normalized = location.toLowerCase().trim();
  const parts = normalized.split(',').map(p => p.trim());

  // Check for exact match
  const exactMatch = KNOWN_LOCATIONS[normalized] !== undefined;

  // Find partial matches
  const partialMatches: string[] = [];
  for (const key in KNOWN_LOCATIONS) {
    if (KNOWN_LOCATIONS.hasOwnProperty(key)) {
      if (normalized.indexOf(key) !== -1 || key.indexOf(normalized) !== -1) {
        partialMatches.push(key);
      }
    }
  }

  // Check city, state pattern
  let cityStateMatch: string | null = null;
  if (parts.length >= 2) {
    const cityState = `${parts[0]}, ${parts[1]}`;
    if (KNOWN_LOCATIONS[cityState]) {
      cityStateMatch = cityState;
    }
  }

  // Check state-only match
  let stateMatch: string | null = null;
  if (parts.length >= 2 && KNOWN_LOCATIONS[parts[1]]) {
    stateMatch = parts[1];
  } else if (parts.length > 0 && KNOWN_LOCATIONS[parts[0]]) {
    stateMatch = parts[0];
  }

  // Generate suggestions based on first part
  const suggestions: string[] = [];
  if (parts.length > 0) {
    const firstPart = parts[0];
    for (const key in KNOWN_LOCATIONS) {
      if (KNOWN_LOCATIONS.hasOwnProperty(key) && key.indexOf(firstPart) !== -1) {
        suggestions.push(key);
        if (suggestions.length >= 5) break; // Limit to 5 suggestions
      }
    }
  }

  return {
    normalized,
    parts,
    exactMatch,
    partialMatches,
    cityStateMatch,
    stateMatch,
    suggestions,
    totalKnownLocations: Object.keys(KNOWN_LOCATIONS).length
  };
}

/**
 * Get statistics about the known locations database
 */
export function getKnownLocationsStats(): {
  total: number;
  usCities: number;
  internationalCities: number;
  states: number;
  countries: number;
} {
  const keys = Object.keys(KNOWN_LOCATIONS);
  let usCities = 0;
  let internationalCities = 0;
  let states = 0;
  let countries = 0;

  for (const key of keys) {
    // Count US states (single word or two words without comma)
    if (key.indexOf(',') === -1) {
      if (key.indexOf('united states') !== -1 || key === 'usa' ||
          key.indexOf('canada') !== -1 || key === 'uk' ||
          key.indexOf('australia') !== -1 || key.indexOf('india') !== -1) {
        countries++;
      } else {
        states++;
      }
    } else {
      // Has comma - it's a city
      const parts = key.split(',').map(p => p.trim());
      const lastPart = parts[parts.length - 1];

      // Check if last part is a US state or US-related
      const usStates = ['massachusetts', 'california', 'new york', 'texas', 'florida',
                        'illinois', 'pennsylvania', 'ohio', 'georgia', 'north carolina',
                        'michigan', 'washington', 'colorado', 'oregon', 'arizona',
                        'ma', 'ca', 'ny', 'tx', 'fl', 'il', 'pa', 'oh', 'ga', 'nc',
                        'mi', 'wa', 'co', 'or', 'az'];

      if (usStates.indexOf(lastPart) !== -1 || lastPart === 'district of columbia') {
        usCities++;
      } else {
        internationalCities++;
      }
    }
  }

  return {
    total: keys.length,
    usCities,
    internationalCities,
    states,
    countries
  };
}
