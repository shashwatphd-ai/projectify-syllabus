/**
 * Location Format Validation Utility
 *
 * Fixes P0-2: Validates location formats before storing or passing to Apollo API
 *
 * Apollo.io expects locations in these formats:
 * - "City, State" (e.g., "Boston, Massachusetts")
 * - "City, State, Country" (e.g., "San Francisco, California, United States")
 * - "Country" (e.g., "United States", "India")
 * - 2-letter ISO country codes (e.g., "US", "IN") - will be converted
 */

/**
 * Valid 2-letter ISO country codes that Apollo accepts
 */
const VALID_COUNTRY_CODES = [
  'US', 'IN', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'CN', 'SG',
  'AE', 'NL', 'SE', 'CH', 'ES', 'IT', 'BR', 'MX', 'KR', 'IL'
];

/**
 * Map of ISO country codes to full country names
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  'IN': 'India',
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'JP': 'Japan',
  'CN': 'China',
  'SG': 'Singapore',
  'AE': 'United Arab Emirates',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'CH': 'Switzerland',
  'ES': 'Spain',
  'IT': 'Italy',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'KR': 'South Korea',
  'IL': 'Israel'
};

export interface LocationValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
  parts?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Validates if a location string is in Apollo-compatible format
 *
 * Valid formats:
 * - "City, State" (e.g., "Boston, Massachusetts")
 * - "City, State, Country" (e.g., "San Francisco, California, United States")
 * - "Country" (e.g., "United States", "India")
 * - 2-letter ISO codes (e.g., "US", "IN")
 *
 * Invalid formats:
 * - Empty strings
 * - Only whitespace
 * - Institution names without location info
 * - Malformed strings
 */
export function validateLocationFormat(location: string | null | undefined): LocationValidationResult {
  // Handle null/undefined/empty
  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    return {
      isValid: false,
      error: 'Location is required'
    };
  }

  const trimmed = location.trim();

  // Check for valid 2-letter ISO country code
  if (trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed)) {
    if (VALID_COUNTRY_CODES.includes(trimmed)) {
      return {
        isValid: true,
        normalized: COUNTRY_CODE_MAP[trimmed],
        parts: { country: COUNTRY_CODE_MAP[trimmed] }
      };
    } else {
      return {
        isValid: false,
        error: `Invalid country code: ${trimmed}`
      };
    }
  }

  // Check for comma-separated format (City, State or City, State, Country)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);

    // Must have 2 or 3 parts
    if (parts.length < 2 || parts.length > 3) {
      return {
        isValid: false,
        error: 'Location must be in format: "City, State" or "City, State, Country"'
      };
    }

    // Each part should contain only letters, spaces, hyphens, and apostrophes
    const validPartPattern = /^[A-Za-z\s\-']+$/;
    for (const part of parts) {
      if (!validPartPattern.test(part)) {
        return {
          isValid: false,
          error: `Invalid location part: "${part}". Only letters, spaces, hyphens, and apostrophes allowed.`
        };
      }
    }

    // If last part is a 2-letter code, convert it
    let normalizedParts = [...parts];
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 2 && /^[A-Z]{2}$/.test(lastPart)) {
      if (VALID_COUNTRY_CODES.includes(lastPart)) {
        normalizedParts[normalizedParts.length - 1] = COUNTRY_CODE_MAP[lastPart];
      } else {
        return {
          isValid: false,
          error: `Invalid country code: ${lastPart}`
        };
      }
    }

    // CRITICAL FIX: For Apollo API, always use 2-part format (City, State) for local searches
    // Even if 3-part format is provided, strip the country to get local results
    // Apollo searches too broadly with "City, State, Country" format
    const apolloFormat = parts.length >= 2
      ? `${parts[0]}, ${parts[1]}`  // Always use just City, State
      : normalizedParts.join(', ');

    if (parts.length === 2) {
      return {
        isValid: true,
        normalized: apolloFormat,
        parts: { city: parts[0], state: parts[1] }
      };
    } else {
      return {
        isValid: true,
        normalized: apolloFormat,  // Use 2-part format for Apollo
        parts: { city: parts[0], state: parts[1], country: normalizedParts[2] }
      };
    }
  }

  // Check for standalone country name (3+ letters, only letters/spaces/hyphens)
  if (trimmed.length >= 3 && /^[A-Za-z\s\-']+$/.test(trimmed)) {
    // Check if it's a known country name
    const isKnownCountry = Object.values(COUNTRY_CODE_MAP).includes(trimmed);

    if (isKnownCountry) {
      return {
        isValid: true,
        normalized: trimmed,
        parts: { country: trimmed }
      };
    } else {
      // Could be a valid country not in our map, allow it
      return {
        isValid: true,
        normalized: trimmed,
        parts: { country: trimmed }
      };
    }
  }

  // If we get here, format is invalid
  return {
    isValid: false,
    error: 'Invalid location format. Use: "City, State", "City, State, Country", or "Country"'
  };
}

/**
 * Validates location data object (from structured form input)
 *
 * Used when location is entered as separate fields (city, state, country)
 */
export function validateLocationData(data: {
  city?: string;
  state?: string;
  country?: string;
}): LocationValidationResult {
  const { city, state, country } = data;

  // Must have at least country
  if (!country || country.trim().length === 0) {
    return {
      isValid: false,
      error: 'Country is required'
    };
  }

  // Validate country format
  const countryTrimmed = country.trim();
  if (!/^[A-Za-z\s\-']+$/.test(countryTrimmed) && !/^[A-Z]{2}$/.test(countryTrimmed)) {
    return {
      isValid: false,
      error: 'Invalid country format'
    };
  }

  // If city provided, state should also be provided (for US locations especially)
  if (city && !state) {
    return {
      isValid: false,
      error: 'If city is provided, state is also required'
    };
  }

  // Build location string
  let locationString: string;
  if (city && state) {
    locationString = `${city.trim()}, ${state.trim()}, ${countryTrimmed}`;
  } else if (state) {
    locationString = `${state.trim()}, ${countryTrimmed}`;
  } else {
    locationString = countryTrimmed;
  }

  // Validate the constructed string
  return validateLocationFormat(locationString);
}

/**
 * Normalizes a location string to Apollo-compatible format
 *
 * - Converts 2-letter ISO codes to full country names
 * - Trims whitespace
 * - Validates format
 *
 * Returns null if validation fails
 */
export function normalizeLocationForApollo(location: string | null | undefined): string | null {
  const result = validateLocationFormat(location);

  if (!result.isValid) {
    console.error('❌ Location validation failed:', result.error);
    return null;
  }

  return result.normalized || location!.trim();
}

/**
 * Checks if a location string looks like it needs manual entry
 *
 * Examples of suspicious formats:
 * - Institution names (e.g., "Harvard University")
 * - URLs (e.g., "www.example.com")
 * - Emails (e.g., "admin@example.com")
 * - Phone numbers
 */
export function needsManualLocationEntry(location: string | null | undefined): boolean {
  if (!location) return true;

  const trimmed = location.trim();

  // Empty or very short
  if (trimmed.length < 2) return true;

  // Contains suspicious patterns
  const suspiciousPatterns = [
    /university|college|institute|school/i,  // Institution names
    /\.com|\.edu|\.org|\.net|www\./i,        // URLs/domains
    /@/,                                       // Email addresses
    /\d{3}-\d{3}-\d{4}/,                      // Phone numbers
    /^\d+$/,                                   // Just numbers
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Run validation check
  const result = validateLocationFormat(trimmed);
  return !result.isValid;
}
