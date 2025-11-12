/**
 * Skills-ML Provider
 *
 * Local skills-to-occupation mapping inspired by Skills-ML library
 * (https://github.com/workforce-data-initiative/skills-ml)
 *
 * Benefits:
 * - NO API calls - fully local
 * - Fast - instant results
 * - No rate limits
 * - Works offline
 * - Based on curated skill-occupation mappings
 *
 * Limitations:
 * - Less comprehensive than O*NET/ESCO
 * - Requires manual updates
 * - English only
 *
 * Part of P0-4 Phase 2: Multi-provider occupation mapping
 */

import {
  OccupationProvider,
  OccupationMappingResult,
  StandardOccupation,
  StandardSkill,
  StandardDWA
} from './occupation-provider-interface.ts';
import { ExtractedSkill } from './skill-extraction-service.ts';

/**
 * Local occupation database (curated mappings)
 */
interface LocalOccupation {
  code: string;              // Custom code
  title: string;
  description: string;
  keywords: string[];        // Keywords for matching
  skills: string[];          // Required skills
  dwas: string[];            // Work activities
  tools: string[];
  relatedTitles: string[];   // Alternative job titles
}

/**
 * Curated occupation database
 * Based on common course-to-occupation mappings
 */
const OCCUPATION_DATABASE: LocalOccupation[] = [
  // Engineering Occupations
  {
    code: 'ENG-001',
    title: 'Mechanical Engineer',
    description: 'Design and develop mechanical and thermal devices',
    keywords: ['mechanical', 'thermodynamics', 'fluid', 'cad', 'solidworks', 'ansys', 'heat transfer', 'mechanics'],
    skills: ['CAD Design', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'MATLAB', 'FEA Analysis'],
    dwas: ['Design mechanical systems', 'Conduct thermal analysis', 'Test prototypes', 'Create technical drawings'],
    tools: ['SolidWorks', 'AutoCAD', 'ANSYS', 'MATLAB', 'CATIA'],
    relatedTitles: ['HVAC Engineer', 'Thermal Engineer', 'Design Engineer', 'Product Engineer']
  },
  {
    code: 'ENG-002',
    title: 'Electrical Engineer',
    description: 'Design and develop electrical systems and components',
    keywords: ['electrical', 'circuit', 'power', 'electronics', 'pspice', 'pcb', 'embedded', 'control systems'],
    skills: ['Circuit Design', 'Power Systems', 'Embedded Systems', 'PCB Design', 'Control Theory', 'Signal Processing'],
    dwas: ['Design electrical circuits', 'Test electronic systems', 'Develop embedded software', 'Analyze power systems'],
    tools: ['PSpice', 'Altium', 'Eagle', 'LabVIEW', 'MATLAB'],
    relatedTitles: ['Electronics Engineer', 'Power Systems Engineer', 'Control Systems Engineer', 'Embedded Systems Engineer']
  },
  {
    code: 'ENG-003',
    title: 'Civil Engineer',
    description: 'Design and oversee construction of infrastructure projects',
    keywords: ['civil', 'structural', 'construction', 'autocad', 'geotechnical', 'transportation', 'surveying'],
    skills: ['Structural Analysis', 'AutoCAD', 'Project Management', 'Geotechnical Engineering', 'Surveying'],
    dwas: ['Design infrastructure projects', 'Conduct site inspections', 'Prepare construction plans', 'Analyze structural integrity'],
    tools: ['AutoCAD Civil 3D', 'Revit', 'SAP2000', 'STAAD Pro'],
    relatedTitles: ['Structural Engineer', 'Transportation Engineer', 'Geotechnical Engineer', 'Construction Engineer']
  },
  {
    code: 'ENG-004',
    title: 'Chemical Engineer',
    description: 'Design chemical manufacturing processes and equipment',
    keywords: ['chemical', 'process', 'reactor', 'thermodynamics', 'mass transfer', 'unit operations', 'aspen'],
    skills: ['Chemical Process Design', 'Thermodynamics', 'Mass Transfer', 'Reaction Engineering', 'Process Simulation'],
    dwas: ['Design chemical processes', 'Optimize production systems', 'Conduct process simulations', 'Ensure safety compliance'],
    tools: ['Aspen Plus', 'HYSYS', 'ChemCAD', 'MATLAB'],
    relatedTitles: ['Process Engineer', 'Production Engineer', 'Plant Engineer', 'Process Safety Engineer']
  },

  // Computer Science Occupations
  {
    code: 'CS-001',
    title: 'Software Engineer',
    description: 'Design, develop, and maintain software applications',
    keywords: ['programming', 'software', 'coding', 'algorithm', 'data structures', 'python', 'java', 'javascript', 'web', 'api'],
    skills: ['Python', 'Java', 'JavaScript', 'Data Structures', 'Algorithms', 'Git', 'REST API', 'SQL'],
    dwas: ['Write and test code', 'Design software architecture', 'Debug applications', 'Collaborate with teams'],
    tools: ['Git', 'VS Code', 'IntelliJ', 'Docker', 'Jenkins'],
    relatedTitles: ['Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'Application Developer']
  },
  {
    code: 'CS-002',
    title: 'Data Scientist',
    description: 'Analyze complex data and build predictive models',
    keywords: ['data science', 'machine learning', 'statistics', 'python', 'r', 'sql', 'tensorflow', 'pandas', 'numpy', 'visualization'],
    skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Visualization', 'TensorFlow', 'Pandas', 'NumPy'],
    dwas: ['Build predictive models', 'Analyze datasets', 'Create visualizations', 'Communicate insights'],
    tools: ['Python', 'R', 'Jupyter', 'TensorFlow', 'PyTorch', 'Tableau', 'SQL'],
    relatedTitles: ['Machine Learning Engineer', 'Data Analyst', 'AI Engineer', 'Analytics Engineer']
  },
  {
    code: 'CS-003',
    title: 'DevOps Engineer',
    description: 'Manage infrastructure and deployment pipelines',
    keywords: ['devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'jenkins', 'automation'],
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux', 'Scripting', 'Monitoring'],
    dwas: ['Manage cloud infrastructure', 'Automate deployments', 'Monitor systems', 'Ensure reliability'],
    tools: ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Ansible', 'Prometheus'],
    relatedTitles: ['Site Reliability Engineer', 'Cloud Engineer', 'Infrastructure Engineer', 'Platform Engineer']
  },
  {
    code: 'CS-004',
    title: 'Cybersecurity Engineer',
    description: 'Protect systems and networks from security threats',
    keywords: ['security', 'cybersecurity', 'network', 'firewall', 'penetration', 'encryption', 'cryptography', 'vulnerability'],
    skills: ['Network Security', 'Penetration Testing', 'Cryptography', 'Security Analysis', 'Incident Response'],
    dwas: ['Monitor security threats', 'Conduct penetration tests', 'Implement security measures', 'Respond to incidents'],
    tools: ['Wireshark', 'Metasploit', 'Nmap', 'Burp Suite', 'Splunk'],
    relatedTitles: ['Security Analyst', 'Penetration Tester', 'Information Security Analyst', 'SOC Analyst']
  },

  // Business Occupations
  {
    code: 'BUS-001',
    title: 'Financial Analyst',
    description: 'Analyze financial data and provide investment recommendations',
    keywords: ['finance', 'financial', 'accounting', 'excel', 'modeling', 'valuation', 'roi', 'dcf', 'investment'],
    skills: ['Financial Modeling', 'Excel', 'Valuation', 'Accounting', 'Data Analysis', 'Forecasting'],
    dwas: ['Build financial models', 'Analyze financial statements', 'Prepare reports', 'Make recommendations'],
    tools: ['Excel', 'Bloomberg Terminal', 'Power BI', 'SQL', 'Python'],
    relatedTitles: ['Investment Analyst', 'Equity Analyst', 'Credit Analyst', 'Corporate Finance Analyst']
  },
  {
    code: 'BUS-002',
    title: 'Marketing Manager',
    description: 'Develop and execute marketing strategies',
    keywords: ['marketing', 'brand', 'campaign', 'digital marketing', 'social media', 'analytics', 'seo', 'content', 'customer'],
    skills: ['Marketing Strategy', 'Digital Marketing', 'Brand Management', 'Analytics', 'SEO', 'Content Creation'],
    dwas: ['Develop marketing campaigns', 'Analyze market trends', 'Manage brand positioning', 'Track KPIs'],
    tools: ['Google Analytics', 'HubSpot', 'Tableau', 'Excel', 'Social Media Platforms'],
    relatedTitles: ['Brand Manager', 'Digital Marketing Manager', 'Product Marketing Manager', 'Growth Manager']
  },
  {
    code: 'BUS-003',
    title: 'Product Manager',
    description: 'Define and execute product strategy and roadmap',
    keywords: ['product', 'product management', 'roadmap', 'agile', 'scrum', 'user', 'feature', 'strategy', 'stakeholder'],
    skills: ['Product Strategy', 'Agile', 'User Research', 'Data Analysis', 'Stakeholder Management', 'Roadmap Planning'],
    dwas: ['Define product vision', 'Prioritize features', 'Work with engineering', 'Analyze user feedback'],
    tools: ['Jira', 'Confluence', 'Figma', 'Excel', 'Analytics Tools'],
    relatedTitles: ['Technical Product Manager', 'Senior Product Manager', 'Product Owner', 'Product Lead']
  },
  {
    code: 'BUS-004',
    title: 'Business Analyst',
    description: 'Analyze business processes and recommend improvements',
    keywords: ['business', 'analysis', 'requirements', 'process', 'sql', 'data', 'stakeholder', 'documentation'],
    skills: ['Requirements Gathering', 'Process Analysis', 'SQL', 'Data Analysis', 'Documentation', 'Stakeholder Communication'],
    dwas: ['Gather requirements', 'Analyze business processes', 'Create documentation', 'Facilitate meetings'],
    tools: ['Excel', 'SQL', 'Visio', 'Tableau', 'Jira'],
    relatedTitles: ['Systems Analyst', 'Data Analyst', 'Process Analyst', 'IT Business Analyst']
  },

  // Data & Analytics
  {
    code: 'DATA-001',
    title: 'Data Engineer',
    description: 'Build and maintain data pipelines and infrastructure',
    keywords: ['data engineering', 'etl', 'pipeline', 'sql', 'spark', 'hadoop', 'airflow', 'warehouse', 'kafka'],
    skills: ['SQL', 'Python', 'ETL', 'Spark', 'Data Warehousing', 'Airflow', 'Kafka'],
    dwas: ['Build data pipelines', 'Maintain data infrastructure', 'Optimize queries', 'Ensure data quality'],
    tools: ['SQL', 'Spark', 'Airflow', 'Kafka', 'dbt', 'Snowflake', 'Redshift'],
    relatedTitles: ['ETL Developer', 'Data Platform Engineer', 'Big Data Engineer', 'Analytics Engineer']
  }
];

/**
 * Skills-ML Provider Implementation
 */
export class SkillsMLProvider implements OccupationProvider {
  readonly name = 'skills-ml';
  readonly version = '1.0.0';

  /**
   * Always configured (local data)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Health check (always healthy - local data)
   */
  async healthCheck(): Promise<boolean> {
    return OCCUPATION_DATABASE.length > 0;
  }

  /**
   * Map skills to occupations using local database
   */
  async mapSkillsToOccupations(
    skills: ExtractedSkill[]
  ): Promise<OccupationMappingResult> {
    const startTime = Date.now();
    console.log(`\n📚 [Skills-ML] Mapping ${skills.length} skills to occupations (local)...`);

    const occupations: StandardOccupation[] = [];
    const unmappedSkills: string[] = [];

    // Extract skill keywords
    const skillKeywords = skills.map(s => s.skill.toLowerCase());

    // Score each occupation in database
    const scoredOccupations = OCCUPATION_DATABASE.map(occ => {
      const matchScore = this.calculateMatchScore(skillKeywords, occ);
      return { occupation: occ, matchScore };
    });

    // Filter and sort by match score
    const matches = scoredOccupations
      .filter(item => item.matchScore > 0.2) // Minimum 20% match
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 matches

    // Convert to StandardOccupation format
    for (const match of matches) {
      const occ = match.occupation;
      const standardOcc: StandardOccupation = {
        code: occ.code,
        title: occ.title,
        description: occ.description,
        matchScore: match.matchScore,
        skills: occ.skills.map((skill, idx) => ({
          id: `${occ.code}-skill-${idx}`,
          name: skill,
          description: skill,
          category: 'technical',
          importance: 80,
          level: 0
        })),
        dwas: occ.dwas.map((dwa, idx) => ({
          id: `${occ.code}-dwa-${idx}`,
          name: dwa,
          description: dwa,
          importance: 75,
          level: 0
        })),
        tools: occ.tools,
        tasks: occ.dwas,
        provider: this.name,
        confidence: this.calculateConfidence(match.matchScore)
      };

      occupations.push(standardOcc);
    }

    // Identify unmapped skills
    const allOccupationSkills = new Set(
      occupations.flatMap(occ => occ.skills.map(s => s.name.toLowerCase()))
    );

    for (const skill of skills) {
      if (!allOccupationSkills.has(skill.skill.toLowerCase())) {
        unmappedSkills.push(skill.skill);
      }
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(`  ✅ Mapped to ${occupations.length} local occupations`);
    console.log(`  ⚠️  Unmapped skills: ${unmappedSkills.length}`);
    console.log(`  ⏱️  Processing time: ${processingTimeMs}ms (local, no API calls)`);

    return {
      occupations,
      totalMapped: occupations.length,
      unmappedSkills,
      provider: this.name,
      apiCalls: 0,      // No API calls
      cacheHits: 0,     // No cache needed
      processingTimeMs,
      metadata: {
        databaseSize: OCCUPATION_DATABASE.length,
        localProvider: true
      }
    };
  }

  /**
   * Calculate match score between skills and occupation
   */
  private calculateMatchScore(
    skillKeywords: string[],
    occupation: LocalOccupation
  ): number {
    const occKeywords = [
      ...occupation.keywords,
      ...occupation.skills.map(s => s.toLowerCase()),
      ...occupation.tools.map(t => t.toLowerCase()),
      occupation.title.toLowerCase()
    ];

    const occText = occKeywords.join(' ');

    let matches = 0;
    let partialMatches = 0;

    for (const skillKeyword of skillKeywords) {
      // Exact match
      if (occKeywords.some(k => k === skillKeyword)) {
        matches += 1.0;
      }
      // Partial match (keyword contains skill or vice versa)
      else if (occText.includes(skillKeyword) || skillKeyword.includes(occText.substring(0, 10))) {
        partialMatches += 0.5;
      }
    }

    const totalScore = matches + partialMatches;
    return skillKeywords.length > 0 ? totalScore / skillKeywords.length : 0;
  }

  /**
   * Calculate confidence based on match score
   */
  private calculateConfidence(matchScore: number): number {
    if (matchScore >= 0.7) return 0.9;
    if (matchScore >= 0.5) return 0.75;
    if (matchScore >= 0.3) return 0.6;
    return 0.5;
  }

  /**
   * Get occupation details by code
   */
  async getOccupationDetails(code: string): Promise<StandardOccupation | null> {
    const occ = OCCUPATION_DATABASE.find(o => o.code === code);
    if (!occ) return null;

    return {
      code: occ.code,
      title: occ.title,
      description: occ.description,
      matchScore: 1.0,
      skills: occ.skills.map((skill, idx) => ({
        id: `${occ.code}-skill-${idx}`,
        name: skill,
        description: skill,
        category: 'technical',
        importance: 80,
        level: 0
      })),
      dwas: occ.dwas.map((dwa, idx) => ({
        id: `${occ.code}-dwa-${idx}`,
        name: dwa,
        description: dwa,
        importance: 75,
        level: 0
      })),
      tools: occ.tools,
      tasks: occ.dwas,
      provider: this.name,
      confidence: 0.9
    };
  }
}

/**
 * Format Skills-ML mapping results for display
 */
export function formatSkillsMLMappingForDisplay(result: OccupationMappingResult): string {
  const lines = [
    `\n📚 Skills-ML Mapping Results (Local)`,
    `   Occupations Mapped: ${result.totalMapped}`,
    `   Unmapped Skills: ${result.unmappedSkills.length}`,
    `   Processing Time: ${result.processingTimeMs}ms (no API calls)`,
    `   Database Size: ${result.metadata?.databaseSize || 0} occupations`,
    '\n   Top Matches:'
  ];

  result.occupations.forEach((occ, i) => {
    lines.push(`\n   ${i + 1}. ${occ.title} (${occ.code})`);
    lines.push(`      Match: ${(occ.matchScore * 100).toFixed(0)}%, Confidence: ${(occ.confidence * 100).toFixed(0)}%`);
    lines.push(`      Skills: ${occ.skills.length}, Tools: ${occ.tools.length}`);
  });

  if (result.unmappedSkills.length > 0) {
    lines.push(`\n   ⚠️  Unmapped Skills: ${result.unmappedSkills.slice(0, 5).join(', ')}${result.unmappedSkills.length > 5 ? '...' : ''}`);
  }

  return lines.join('\n');
}
