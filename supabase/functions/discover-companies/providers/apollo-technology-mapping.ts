/**
 * SOC Code to Apollo Technology UID Mapping
 *
 * Maps O*NET SOC codes to Apollo's verified technology UIDs for precise company filtering.
 * Apollo supports 1,500+ technologies - companies' use of these is verified data.
 *
 * Benefits:
 * - More reliable than keyword matching
 * - Automatically excludes staffing firms (they don't use engineering software)
 * - Precisely targets companies that actually use relevant technologies
 *
 * To get the full list of Apollo technology UIDs:
 * https://www.apollo.io/technologies
 */

export const SOC_TO_APOLLO_TECHNOLOGIES: Record<string, string[]> = {
  // ==========================================
  // ENGINEERING & MANUFACTURING
  // ==========================================

  // Mechanical Engineers (17-2141.00)
  '17-2141.00': [
    'autocad',        // CAD software (industry standard)
    'solidworks',     // 3D CAD
    'ansys',          // Engineering simulation
    'matlab',         // Technical computing
    'catia',          // CAD for manufacturing
    'inventor',       // 3D mechanical design
    'creo'            // CAD software
  ],

  // Industrial Engineers (17-2112.00)
  '17-2112.00': [
    'autocad',        // CAD software
    'matlab',         // Technical computing
    'minitab',        // Statistical analysis
    'arena',          // Simulation software
    'simul8',         // Simulation
    'plc'             // PLC programming
  ],

  // Aerospace Engineers (17-2011.00)
  '17-2011.00': [
    'autocad',
    'catia',
    'matlab',
    'ansys',
    'solidworks',
    'nastran'         // Finite element analysis
  ],

  // Civil Engineers (17-2051.00)
  '17-2051.00': [
    'autocad',
    'civil-3d',       // Civil engineering CAD
    'revit',          // BIM software
    'staad-pro',      // Structural analysis
    'etabs',          // Structural design
    'sap2000'         // Structural analysis
  ],

  // Electrical Engineers (17-2071.00)
  '17-2071.00': [
    'autocad',
    'matlab',
    'pspice',         // Circuit simulation
    'multisim',       // Electronics simulation
    'altium',         // PCB design
    'orcad'           // Electronics CAD
  ],

  // Chemical Engineers (17-2041.00)
  '17-2041.00': [
    'aspen-plus',     // Process simulation
    'hysys',          // Process engineering
    'matlab',
    'chemcad'         // Chemical process simulation
  ],

  // Robotics Engineers (17-2199.08)
  '17-2199.08': [
    'ros',            // Robot Operating System
    'matlab',
    'solidworks',
    'python',
    'c-plus-plus',
    'labview'         // Automation software
  ],

  // ==========================================
  // SOFTWARE & COMPUTER SCIENCE
  // ==========================================

  // Software Developers (15-1252.00)
  '15-1252.00': [
    'javascript',
    'python',
    'java',
    'react',
    'nodejs',
    'git',
    'docker',
    'kubernetes',
    'aws',
    'typescript'
  ],

  // Computer Systems Engineers/Architects (15-1299.08)
  '15-1299.08': [
    'aws',
    'azure',
    'docker',
    'kubernetes',
    'terraform',
    'ansible',
    'jenkins',
    'linux'
  ],

  // Data Scientists (15-2051.00)
  '15-2051.00': [
    'python',
    'r',
    'sql',
    'tableau',
    'power-bi',
    'tensorflow',
    'pytorch',
    'jupyter',
    'pandas',
    'spark'
  ],

  // Database Administrators (15-1242.00)
  '15-1242.00': [
    'sql',
    'oracle',
    'mysql',
    'postgresql',
    'mongodb',
    'redis',
    'elasticsearch'
  ],

  // ==========================================
  // BUSINESS & MANAGEMENT
  // ==========================================

  // Management Analysts (13-1111.00)
  '13-1111.00': [
    'excel',
    'powerpoint',
    'tableau',
    'power-bi',
    'sql',
    'salesforce'
  ],

  // Financial Analysts (13-2051.00)
  '13-2051.00': [
    'excel',
    'bloomberg',
    'sql',
    'python',
    'tableau',
    'power-bi',
    'vba'
  ],

  // ==========================================
  // DEFAULT FALLBACK
  // ==========================================
  'default': [
    'microsoft-office',  // Universal baseline
    'excel',
    'powerpoint',
    'google-workspace'
  ]
};

/**
 * Get Apollo technology UIDs for a list of SOC codes
 * Returns combined deduplicated list of technologies
 */
export function getTechnologiesForSOCCodes(socCodes: string[]): string[] {
  const technologies = new Set<string>();

  for (const code of socCodes) {
    const techs = SOC_TO_APOLLO_TECHNOLOGIES[code];
    if (techs) {
      techs.forEach(t => technologies.add(t));
    }
  }

  // If no specific technologies found, use default
  if (technologies.size === 0) {
    SOC_TO_APOLLO_TECHNOLOGIES['default'].forEach(t => technologies.add(t));
  }

  // Limit to top 10 technologies to avoid over-constraining search
  return Array.from(technologies).slice(0, 10);
}
