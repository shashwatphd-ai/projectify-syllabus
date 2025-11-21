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
 * Known city coordinates for common US cities and states
 * Used as fallback when geocoding API is unavailable
 */
const KNOWN_LOCATIONS: Record<string, GeoCoordinates> = {
  // Major cities
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

  // State-level fallbacks (center of state)
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

  // Common abbreviations
  'boston, ma': { latitude: 42.3601, longitude: -71.0589 },
  'new york, ny': { latitude: 40.7128, longitude: -74.0060 },
  'san francisco, ca': { latitude: 37.7749, longitude: -122.4194 },
  'los angeles, ca': { latitude: 34.0522, longitude: -118.2437 },
  'chicago, il': { latitude: 41.8781, longitude: -87.6298 },
  'seattle, wa': { latitude: 47.6062, longitude: -122.3321 },
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
