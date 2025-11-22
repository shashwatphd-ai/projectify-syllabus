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
  // ========================================
  // UNITED STATES - Major Cities
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
  // UNITED STATES - University Cities
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
  'madison, wisconsin': { latitude: 43.0731, longitude: -89.4012 },
  'urbana, illinois': { latitude: 40.1106, longitude: -88.2073 },
  'champaign, illinois': { latitude: 40.1164, longitude: -88.2434 },
  'state college, pennsylvania': { latitude: 40.7934, longitude: -77.8600 },
  'boulder, colorado': { latitude: 40.0150, longitude: -105.2705 },
  'tucson, arizona': { latitude: 32.2226, longitude: -110.9747 },

  // ========================================
  // UNITED STATES - Tech Hubs
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
  // UNITED STATES - Additional Metro Areas
  // ========================================
  'st. louis, missouri': { latitude: 38.6270, longitude: -90.1994 },
  'omaha, nebraska': { latitude: 41.2565, longitude: -95.9345 },
  'buffalo, new york': { latitude: 42.8864, longitude: -78.8784 },
  'rochester, new york': { latitude: 43.1566, longitude: -77.6088 },
  'syracuse, new york': { latitude: 43.0481, longitude: -76.1474 },
  'louisville, kentucky': { latitude: 38.2527, longitude: -85.7585 },
  'memphis, tennessee': { latitude: 35.1495, longitude: -90.0490 },
  'new orleans, louisiana': { latitude: 29.9511, longitude: -90.0715 },
  'oklahoma city, oklahoma': { latitude: 35.4676, longitude: -97.5164 },
  'tulsa, oklahoma': { latitude: 36.1540, longitude: -95.9928 },
  'albuquerque, new mexico': { latitude: 35.0844, longitude: -106.6504 },
  'las vegas, nevada': { latitude: 36.1699, longitude: -115.1398 },
  'sacramento, california': { latitude: 38.5816, longitude: -121.4944 },
  'tampa, florida': { latitude: 27.9506, longitude: -82.4572 },
  'orlando, florida': { latitude: 28.5383, longitude: -81.3792 },
  'jacksonville, florida': { latitude: 30.3322, longitude: -81.6557 },
  'cincinnati, ohio': { latitude: 39.1031, longitude: -84.5120 },
  'richmond, virginia': { latitude: 37.5407, longitude: -77.4360 },
  'norfolk, virginia': { latitude: 36.8508, longitude: -76.2859 },
  'greensboro, north carolina': { latitude: 36.0726, longitude: -79.7920 },

  // ========================================
  // UNITED STATES - State Abbreviations
  // ========================================
  'boston, ma': { latitude: 42.3601, longitude: -71.0589 },
  'new york, ny': { latitude: 40.7128, longitude: -74.0060 },
  'san francisco, ca': { latitude: 37.7749, longitude: -122.4194 },
  'los angeles, ca': { latitude: 34.0522, longitude: -118.2437 },
  'chicago, il': { latitude: 41.8781, longitude: -87.6298 },
  'seattle, wa': { latitude: 47.6062, longitude: -122.3321 },
  'kansas city, mo': { latitude: 39.0997, longitude: -94.5786 },
  'kansas city, ks': { latitude: 39.1142, longitude: -94.6275 },
  'arlington, va': { latitude: 38.8816, longitude: -77.0910 },
  'new haven, ct': { latitude: 41.3083, longitude: -72.9279 },
  'princeton, nj': { latitude: 40.3573, longitude: -74.6672 },
  'providence, ri': { latitude: 41.8240, longitude: -71.4128 },
  'louisville, ky': { latitude: 38.2527, longitude: -85.7585 },
  'new orleans, la': { latitude: 29.9511, longitude: -90.0715 },
  'oklahoma city, ok': { latitude: 35.4676, longitude: -97.5164 },
  'albuquerque, nm': { latitude: 35.0844, longitude: -106.6504 },

  // ========================================
  // UNITED STATES - State-Level Fallbacks
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
  'oklahoma': { latitude: 35.4676, longitude: -97.5164 },
  'new mexico': { latitude: 34.5199, longitude: -105.8701 },
  'idaho': { latitude: 44.0682, longitude: -114.7420 },
  'nebraska': { latitude: 41.4925, longitude: -99.9018 },
  'alabama': { latitude: 32.3182, longitude: -86.9023 },
  'south carolina': { latitude: 33.8361, longitude: -81.1637 },
  'iowa': { latitude: 41.8780, longitude: -93.0977 },
  'maine': { latitude: 45.2538, longitude: -69.4455 },
  'vermont': { latitude: 44.5588, longitude: -72.5778 },
  'new hampshire': { latitude: 43.1939, longitude: -71.5724 },
  'delaware': { latitude: 38.9108, longitude: -75.5277 },
  'west virginia': { latitude: 38.5976, longitude: -80.4549 },
  'arkansas': { latitude: 35.2010, longitude: -91.8318 },
  'mississippi': { latitude: 32.3547, longitude: -89.3985 },
  'montana': { latitude: 46.8797, longitude: -110.3626 },
  'wyoming': { latitude: 43.0760, longitude: -107.2903 },
  'south dakota': { latitude: 43.9695, longitude: -99.9018 },
  'north dakota': { latitude: 47.5515, longitude: -101.0020 },
  'alaska': { latitude: 64.2008, longitude: -149.4937 },
  'hawaii': { latitude: 19.8968, longitude: -155.5828 },

  // ========================================
  // CANADA
  // ========================================
  'toronto, canada': { latitude: 43.6532, longitude: -79.3832 },
  'toronto, ontario': { latitude: 43.6532, longitude: -79.3832 },
  'vancouver, canada': { latitude: 49.2827, longitude: -123.1207 },
  'vancouver, british columbia': { latitude: 49.2827, longitude: -123.1207 },
  'montreal, canada': { latitude: 45.5017, longitude: -73.5673 },
  'montreal, quebec': { latitude: 45.5017, longitude: -73.5673 },
  'ottawa, canada': { latitude: 45.4215, longitude: -75.6972 },
  'calgary, canada': { latitude: 51.0447, longitude: -114.0719 },
  'edmonton, canada': { latitude: 53.5461, longitude: -113.4938 },
  'waterloo, canada': { latitude: 43.4643, longitude: -80.5204 },
  'waterloo, ontario': { latitude: 43.4643, longitude: -80.5204 },

  // ========================================
  // UNITED KINGDOM
  // ========================================
  'london, united kingdom': { latitude: 51.5074, longitude: -0.1278 },
  'london, uk': { latitude: 51.5074, longitude: -0.1278 },
  'london, england': { latitude: 51.5074, longitude: -0.1278 },
  'cambridge, united kingdom': { latitude: 52.2053, longitude: 0.1218 },
  'oxford, united kingdom': { latitude: 51.7520, longitude: -1.2577 },
  'manchester, united kingdom': { latitude: 53.4808, longitude: -2.2426 },
  'edinburgh, united kingdom': { latitude: 55.9533, longitude: -3.1883 },
  'glasgow, united kingdom': { latitude: 55.8642, longitude: -4.2518 },
  'birmingham, united kingdom': { latitude: 52.4862, longitude: -1.8904 },
  'bristol, united kingdom': { latitude: 51.4545, longitude: -2.5879 },

  // ========================================
  // AUSTRALIA
  // ========================================
  'sydney, australia': { latitude: -33.8688, longitude: 151.2093 },
  'melbourne, australia': { latitude: -37.8136, longitude: 144.9631 },
  'brisbane, australia': { latitude: -27.4698, longitude: 153.0251 },
  'perth, australia': { latitude: -31.9505, longitude: 115.8605 },
  'adelaide, australia': { latitude: -34.9285, longitude: 138.6007 },
  'canberra, australia': { latitude: -35.2809, longitude: 149.1300 },

  // ========================================
  // INDIA
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
  'gurgaon, india': { latitude: 28.4595, longitude: 77.0266 },
  'noida, india': { latitude: 28.5355, longitude: 77.3910 },

  // ========================================
  // AFRICA
  // ========================================
  'cairo, egypt': { latitude: 30.0444, longitude: 31.2357 },
  'lagos, nigeria': { latitude: 6.5244, longitude: 3.3792 },
  'johannesburg, south africa': { latitude: -26.2041, longitude: 28.0473 },
  'cape town, south africa': { latitude: -33.9249, longitude: 18.4241 },
  'nairobi, kenya': { latitude: -1.2864, longitude: 36.8172 },
  'accra, ghana': { latitude: 5.6037, longitude: -0.1870 },
  'addis ababa, ethiopia': { latitude: 9.0320, longitude: 38.7469 },
  'casablanca, morocco': { latitude: 33.5731, longitude: -7.5898 },
  'tunis, tunisia': { latitude: 36.8065, longitude: 10.1815 },
  'algiers, algeria': { latitude: 36.7538, longitude: 3.0588 },
  'dar es salaam, tanzania': { latitude: -6.7924, longitude: 39.2083 },
  'kampala, uganda': { latitude: 0.3476, longitude: 32.5825 },
  'khartoum, sudan': { latitude: 15.5007, longitude: 32.5599 },
  'lusaka, zambia': { latitude: -15.3875, longitude: 28.3228 },
  'harare, zimbabwe': { latitude: -17.8252, longitude: 31.0335 },

  // ========================================
  // MIDDLE EAST
  // ========================================
  'dubai, uae': { latitude: 25.2048, longitude: 55.2708 },
  'dubai, united arab emirates': { latitude: 25.2048, longitude: 55.2708 },
  'abu dhabi, uae': { latitude: 24.4539, longitude: 54.3773 },
  'abu dhabi, united arab emirates': { latitude: 24.4539, longitude: 54.3773 },
  'doha, qatar': { latitude: 25.2854, longitude: 51.5310 },
  'riyadh, saudi arabia': { latitude: 24.7136, longitude: 46.6753 },
  'jeddah, saudi arabia': { latitude: 21.5433, longitude: 39.1728 },
  'tel aviv, israel': { latitude: 32.0853, longitude: 34.7818 },
  'jerusalem, israel': { latitude: 31.7683, longitude: 35.2137 },
  'amman, jordan': { latitude: 31.9454, longitude: 35.9284 },
  'beirut, lebanon': { latitude: 33.8886, longitude: 35.4955 },
  'istanbul, turkey': { latitude: 41.0082, longitude: 28.9784 },
  'ankara, turkey': { latitude: 39.9334, longitude: 32.8597 },
  'kuwait city, kuwait': { latitude: 29.3759, longitude: 47.9774 },
  'muscat, oman': { latitude: 23.5880, longitude: 58.3829 },
  'manama, bahrain': { latitude: 26.2285, longitude: 50.5860 },

  // ========================================
  // LATIN AMERICA
  // ========================================
  'mexico city, mexico': { latitude: 19.4326, longitude: -99.1332 },
  'buenos aires, argentina': { latitude: -34.6037, longitude: -58.3816 },
  'sao paulo, brazil': { latitude: -23.5505, longitude: -46.6333 },
  'rio de janeiro, brazil': { latitude: -22.9068, longitude: -43.1729 },
  'brasilia, brazil': { latitude: -15.8267, longitude: -47.9218 },
  'santiago, chile': { latitude: -33.4489, longitude: -70.6693 },
  'bogota, colombia': { latitude: 4.7110, longitude: -74.0721 },
  'lima, peru': { latitude: -12.0464, longitude: -77.0428 },
  'quito, ecuador': { latitude: -0.1807, longitude: -78.4678 },
  'caracas, venezuela': { latitude: 10.4806, longitude: -66.9036 },
  'panama city, panama': { latitude: 8.9824, longitude: -79.5199 },
  'san jose, costa rica': { latitude: 9.9281, longitude: -84.0907 },
  'guatemala city, guatemala': { latitude: 14.6349, longitude: -90.5069 },
  'havana, cuba': { latitude: 23.1136, longitude: -82.3666 },
  'santo domingo, dominican republic': { latitude: 18.4861, longitude: -69.9312 },
  'san juan, puerto rico': { latitude: 18.4655, longitude: -66.1057 },
  'montevideo, uruguay': { latitude: -34.9011, longitude: -56.1645 },
  'la paz, bolivia': { latitude: -16.5000, longitude: -68.1500 },
  'asuncion, paraguay': { latitude: -25.2637, longitude: -57.5759 },

  // ========================================
  // ASIA - EAST & SOUTHEAST
  // ========================================
  'singapore': { latitude: 1.3521, longitude: 103.8198 },
  'singapore, singapore': { latitude: 1.3521, longitude: 103.8198 },
  'tokyo, japan': { latitude: 35.6762, longitude: 139.6503 },
  'seoul, south korea': { latitude: 37.5665, longitude: 126.9780 },
  'shanghai, china': { latitude: 31.2304, longitude: 121.4737 },
  'beijing, china': { latitude: 39.9042, longitude: 116.4074 },
  'hong kong': { latitude: 22.3193, longitude: 114.1694 },
  'hong kong, china': { latitude: 22.3193, longitude: 114.1694 },
  'bangkok, thailand': { latitude: 13.7563, longitude: 100.5018 },
  'kuala lumpur, malaysia': { latitude: 3.1390, longitude: 101.6869 },
  'jakarta, indonesia': { latitude: -6.2088, longitude: 106.8456 },
  'manila, philippines': { latitude: 14.5995, longitude: 120.9842 },
  'ho chi minh city, vietnam': { latitude: 10.8231, longitude: 106.6297 },
  'hanoi, vietnam': { latitude: 21.0285, longitude: 105.8542 },
  'phnom penh, cambodia': { latitude: 11.5564, longitude: 104.9282 },
  'yangon, myanmar': { latitude: 16.8661, longitude: 96.1951 },
  'dhaka, bangladesh': { latitude: 23.8103, longitude: 90.4125 },
  'colombo, sri lanka': { latitude: 6.9271, longitude: 79.8612 },
  'kathmandu, nepal': { latitude: 27.7172, longitude: 85.3240 },
  'wellington, new zealand': { latitude: -41.2865, longitude: 174.7762 },
  'auckland, new zealand': { latitude: -36.8485, longitude: 174.7633 },

  // ========================================
  // EUROPE - EASTERN & CENTRAL
  // ========================================
  'moscow, russia': { latitude: 55.7558, longitude: 37.6173 },
  'saint petersburg, russia': { latitude: 59.9343, longitude: 30.3351 },
  'warsaw, poland': { latitude: 52.2297, longitude: 21.0122 },
  'prague, czech republic': { latitude: 50.0755, longitude: 14.4378 },
  'budapest, hungary': { latitude: 47.4979, longitude: 19.0402 },
  'bucharest, romania': { latitude: 44.4268, longitude: 26.1025 },
  'vienna, austria': { latitude: 48.2082, longitude: 16.3738 },
  'athens, greece': { latitude: 37.9838, longitude: 23.7275 },
  'sofia, bulgaria': { latitude: 42.6977, longitude: 23.3219 },
  'bratislava, slovakia': { latitude: 48.1486, longitude: 17.1077 },
  'tallinn, estonia': { latitude: 59.4370, longitude: 24.7536 },
  'riga, latvia': { latitude: 56.9496, longitude: 24.1052 },
  'vilnius, lithuania': { latitude: 54.6872, longitude: 25.2797 },
  'kiev, ukraine': { latitude: 50.4501, longitude: 30.5234 },
  'almaty, kazakhstan': { latitude: 43.2220, longitude: 76.8512 },
  'tashkent, uzbekistan': { latitude: 41.2995, longitude: 69.2401 },

  // ========================================
  // EUROPE - WESTERN
  // ========================================
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
  'madrid, spain': { latitude: 40.4168, longitude: -3.7038 },
  'barcelona, spain': { latitude: 41.3851, longitude: 2.1734 },
  'rome, italy': { latitude: 41.9028, longitude: 12.4964 },
  'milan, italy': { latitude: 45.4642, longitude: 9.1900 },
  'brussels, belgium': { latitude: 50.8503, longitude: 4.3517 },
  'lisbon, portugal': { latitude: 38.7223, longitude: -9.1393 },
  'geneva, switzerland': { latitude: 46.2044, longitude: 6.1432 },

  // ========================================
  // COUNTRY-LEVEL FALLBACKS
  // ========================================
  // North America
  'united states': { latitude: 37.0902, longitude: -95.7129 },
  'usa': { latitude: 37.0902, longitude: -95.7129 },
  'canada': { latitude: 56.1304, longitude: -106.3468 },
  'mexico': { latitude: 23.6345, longitude: -102.5528 },
  
  // Europe
  'united kingdom': { latitude: 55.3781, longitude: -3.4360 },
  'uk': { latitude: 55.3781, longitude: -3.4360 },
  'germany': { latitude: 51.1657, longitude: 10.4515 },
  'france': { latitude: 46.2276, longitude: 2.2137 },
  'spain': { latitude: 40.4637, longitude: -3.7492 },
  'italy': { latitude: 41.8719, longitude: 12.5674 },
  'netherlands': { latitude: 52.1326, longitude: 5.2913 },
  'belgium': { latitude: 50.5039, longitude: 4.4699 },
  'switzerland': { latitude: 46.8182, longitude: 8.2275 },
  'austria': { latitude: 47.5162, longitude: 14.5501 },
  'sweden': { latitude: 60.1282, longitude: 18.6435 },
  'norway': { latitude: 60.4720, longitude: 8.4689 },
  'denmark': { latitude: 56.2639, longitude: 9.5018 },
  'finland': { latitude: 61.9241, longitude: 25.7482 },
  'poland': { latitude: 51.9194, longitude: 19.1451 },
  'czech republic': { latitude: 49.8175, longitude: 15.4730 },
  'hungary': { latitude: 47.1625, longitude: 19.5033 },
  'romania': { latitude: 45.9432, longitude: 24.9668 },
  'greece': { latitude: 39.0742, longitude: 21.8243 },
  'portugal': { latitude: 39.3999, longitude: -8.2245 },
  'ireland': { latitude: 53.4129, longitude: -8.2439 },
  'russia': { latitude: 61.5240, longitude: 105.3188 },

  // Asia-Pacific
  'australia': { latitude: -25.2744, longitude: 133.7751 },
  'india': { latitude: 20.5937, longitude: 78.9629 },
  'japan': { latitude: 36.2048, longitude: 138.2529 },
  'china': { latitude: 35.8617, longitude: 104.1954 },
  'south korea': { latitude: 35.9078, longitude: 127.7669 },
  'thailand': { latitude: 15.8700, longitude: 100.9925 },
  'malaysia': { latitude: 4.2105, longitude: 101.9758 },
  'indonesia': { latitude: -0.7893, longitude: 113.9213 },
  'philippines': { latitude: 12.8797, longitude: 121.7740 },
  'vietnam': { latitude: 14.0583, longitude: 108.2772 },
  'bangladesh': { latitude: 23.6850, longitude: 90.3563 },
  'pakistan': { latitude: 30.3753, longitude: 69.3451 },
  'sri lanka': { latitude: 7.8731, longitude: 80.7718 },
  'nepal': { latitude: 28.3949, longitude: 84.1240 },
  'taiwan': { latitude: 23.6978, longitude: 120.9605 },
  'new zealand': { latitude: -40.9006, longitude: 174.8860 },

  // Middle East
  'israel': { latitude: 31.0461, longitude: 34.8516 },
  'turkey': { latitude: 38.9637, longitude: 35.2433 },
  'saudi arabia': { latitude: 23.8859, longitude: 45.0792 },
  'uae': { latitude: 23.4241, longitude: 53.8478 },
  'united arab emirates': { latitude: 23.4241, longitude: 53.8478 },
  'qatar': { latitude: 25.3548, longitude: 51.1839 },
  'kuwait': { latitude: 29.3117, longitude: 47.4818 },
  'oman': { latitude: 21.4735, longitude: 55.9754 },
  'bahrain': { latitude: 26.0667, longitude: 50.5577 },
  'jordan': { latitude: 30.5852, longitude: 36.2384 },
  'lebanon': { latitude: 33.8547, longitude: 35.8623 },
  'egypt': { latitude: 26.8206, longitude: 30.8025 },

  // Africa
  'south africa': { latitude: -30.5595, longitude: 22.9375 },
  'nigeria': { latitude: 9.0820, longitude: 8.6753 },
  'kenya': { latitude: -0.0236, longitude: 37.9062 },
  'ghana': { latitude: 7.9465, longitude: -1.0232 },
  'ethiopia': { latitude: 9.1450, longitude: 40.4897 },
  'morocco': { latitude: 31.7917, longitude: -7.0926 },
  'tunisia': { latitude: 33.8869, longitude: 9.5375 },
  'algeria': { latitude: 28.0339, longitude: 1.6596 },
  'tanzania': { latitude: -6.3690, longitude: 34.8888 },
  'uganda': { latitude: 1.3733, longitude: 32.2903 },
  'zimbabwe': { latitude: -19.0154, longitude: 29.1549 },
  'zambia': { latitude: -13.1339, longitude: 27.8493 },

  // Latin America
  'brazil': { latitude: -14.2350, longitude: -51.9253 },
  'argentina': { latitude: -38.4161, longitude: -63.6167 },
  'chile': { latitude: -35.6751, longitude: -71.5430 },
  'colombia': { latitude: 4.5709, longitude: -74.2973 },
  'peru': { latitude: -9.1900, longitude: -75.0152 },
  'venezuela': { latitude: 6.4238, longitude: -66.5897 },
  'ecuador': { latitude: -1.8312, longitude: -78.1834 },
  'bolivia': { latitude: -16.2902, longitude: -63.5887 },
  'paraguay': { latitude: -23.4425, longitude: -58.4438 },
  'uruguay': { latitude: -32.5228, longitude: -55.7658 },
  'costa rica': { latitude: 9.7489, longitude: -83.7534 },
  'panama': { latitude: 8.5380, longitude: -80.7821 },
  'guatemala': { latitude: 15.7835, longitude: -90.2308 },
  'cuba': { latitude: 21.5218, longitude: -77.7812 },
  'dominican republic': { latitude: 18.7357, longitude: -70.1627 },
};

/**
 * Geocode location using Nominatim (OpenStreetMap) API
 * Free service, no API key required
 * @param location Location string to geocode
 * @returns Coordinates or null if geocoding fails
 */
async function geocodeLocation(location: string): Promise<GeoCoordinates | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'EduThree-Discovery-Pipeline/1.0'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Nominatim geocoding failed (HTTP ${response.status}) for: ${location}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      const coords = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
      console.log(`🌍 Geocoded "${location}" → ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      return coords;
    }

    console.warn(`Nominatim returned no results for: ${location}`);
    return null;
  } catch (error) {
    console.warn(`Geocoding error for "${location}":`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Parse location string to coordinates
 * NEW STRATEGY:
 * 1. Try Nominatim geocoding API (works for ANY location worldwide)
 * 2. Fall back to hardcoded KNOWN_LOCATIONS (374 major cities)
 * 3. Try partial matching and parsing as last resort
 */
export async function parseLocationToCoordinates(location: string): Promise<LocationParseResult> {
  if (!location || location.trim().length === 0) {
    return {
      success: false,
      location,
      error: 'Empty location string'
    };
  }

  const normalizedLocation = location.toLowerCase().trim();

  // PRIORITY 1: Try Nominatim geocoding API (works for ANY location worldwide)
  const geocodedCoords = await geocodeLocation(location);
  if (geocodedCoords) {
    return {
      success: true,
      coordinates: geocodedCoords,
      location
    };
  }

  // PRIORITY 2: Check hardcoded known locations (374 major cities - fast fallback)
  if (KNOWN_LOCATIONS[normalizedLocation]) {
    console.log(`📍 Using hardcoded coordinates for: ${location}`);
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
 * NEW: Uses async geocoding API, so this function is now async
 *
 * @param location1 First location string (e.g., "Boston, MA")
 * @param location2 Second location string (e.g., "New York, NY")
 * @returns Distance in miles, or null if locations cannot be parsed
 */
export async function calculateDistanceBetweenLocations(
  location1: string,
  location2: string
): Promise<number | null> {
  const parse1 = await parseLocationToCoordinates(location1);
  const parse2 = await parseLocationToCoordinates(location2);

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
  const exactMatch = !!KNOWN_LOCATIONS[normalized];

  // Find partial matches
  const partialMatches: string[] = [];
  const suggestions: string[] = [];
  
  for (const key in KNOWN_LOCATIONS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      partialMatches.push(key);
    }
    
    // Suggest locations with similar parts
    const keyParts = key.split(',').map(p => p.trim());
    if (parts.length >= 2 && keyParts.length >= 2) {
      if (parts[0] === keyParts[0] || parts[1] === keyParts[1]) {
        suggestions.push(key);
      }
    }
  }

  // Try city, state match
  let cityStateMatch: string | null = null;
  if (parts.length >= 2) {
    const testKey = `${parts[0]}, ${parts[1]}`;
    if (KNOWN_LOCATIONS[testKey]) {
      cityStateMatch = testKey;
    }
  }

  // Try state match
  let stateMatch: string | null = null;
  if (parts.length >= 2 && KNOWN_LOCATIONS[parts[1]]) {
    stateMatch = parts[1];
  }

  return {
    normalized,
    parts,
    exactMatch,
    partialMatches: partialMatches.slice(0, 5), // Limit to 5
    cityStateMatch,
    stateMatch,
    suggestions: suggestions.slice(0, 5), // Limit to 5
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
    const parts = key.split(',').map(p => p.trim());
    
    // US states (single part, lowercase state names)
    if (parts.length === 1 && 
        (key.includes('massachusetts') || key.includes('california') || 
         key.includes('new york') || key.includes('texas') ||
         key.includes('florida') || key.includes('illinois') ||
         key.includes('pennsylvania') || key.includes('ohio') ||
         key.includes('georgia') || key.includes('north carolina') ||
         key.includes('michigan') || key.includes('washington') ||
         key.includes('colorado') || key.includes('oregon') ||
         key.includes('arizona') || key.includes('tennessee') ||
         key.includes('missouri') || key.includes('maryland') ||
         key.includes('wisconsin') || key.includes('minnesota') ||
         key.includes('indiana') || key.includes('utah') ||
         key.includes('kansas') || key.includes('nevada') ||
         key.includes('virginia') || key.includes('connecticut') ||
         key.includes('jersey') || key.includes('island') ||
         key.includes('kentucky') || key.includes('louisiana') ||
         key.includes('oklahoma') || key.includes('mexico') ||
         key.includes('idaho') || key.includes('nebraska') ||
         key.includes('alabama') || key.includes('carolina') ||
         key.includes('iowa') || key.includes('maine') ||
         key.includes('vermont') || key.includes('hampshire') ||
         key.includes('delaware') || key.includes('west virginia') ||
         key.includes('arkansas') || key.includes('mississippi') ||
         key.includes('montana') || key.includes('wyoming') ||
         key.includes('dakota') || key.includes('alaska') ||
         key.includes('hawaii'))) {
      states++;
    }
    // Countries (single part without state names)
    else if (parts.length === 1) {
      countries++;
    }
    // US cities (contains state name in second part)
    else if (parts.length >= 2 && 
             (key.includes(', massachusetts') || key.includes(', california') ||
              key.includes(', new york') || key.includes(', texas') ||
              key.includes(', florida') || key.includes(', illinois') ||
              key.includes(', pennsylvania') || key.includes(', ohio') ||
              key.includes(', georgia') || key.includes(', carolina') ||
              key.includes(', michigan') || key.includes(', washington') ||
              key.includes(', colorado') || key.includes(', oregon') ||
              key.includes(', arizona') || key.includes(', tennessee') ||
              key.includes(', missouri') || key.includes(', maryland') ||
              key.includes(', wisconsin') || key.includes(', minnesota') ||
              key.includes(', indiana') || key.includes(', utah') ||
              key.includes(', kansas') || key.includes(', nevada') ||
              key.includes(', virginia') || key.includes(', connecticut') ||
              key.includes(', jersey') || key.includes(', island') ||
              key.includes(', kentucky') || key.includes(', louisiana') ||
              key.includes(', oklahoma') || key.includes(', mexico') ||
              key.includes(', idaho') || key.includes(', nebraska') ||
              key.includes(', alabama') || key.includes(', iowa') ||
              key.includes(', maine') || key.includes(', vermont') ||
              key.includes(', hampshire') || key.includes(', delaware') ||
              key.includes(', arkansas') || key.includes(', mississippi') ||
              key.includes(', montana') || key.includes(', wyoming') ||
              key.includes(', dakota') || key.includes(', alaska') ||
              key.includes(', hawaii') || key.includes(', dc') ||
              key.includes(', ma') || key.includes(', ca') ||
              key.includes(', ny') || key.includes(', il') ||
              key.includes(', wa') || key.includes(', mo') ||
              key.includes(', ks') || key.includes(', va') ||
              key.includes(', ct') || key.includes(', nj') ||
              key.includes(', ri') || key.includes(', ky') ||
              key.includes(', la') || key.includes(', ok') ||
              key.includes(', nm'))) {
      usCities++;
    }
    // International cities
    else if (parts.length >= 2) {
      internationalCities++;
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
