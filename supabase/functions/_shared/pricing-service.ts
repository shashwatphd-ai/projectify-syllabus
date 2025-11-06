// Apollo-Enriched Pricing & ROI Calculation Service
// Extracted from generate-projects for modularity and testability

interface CompanyInfo {
  name: string;
  website?: string;
  location?: string;
  sector?: string;
  size?: string;
  description?: string;
  organization_employee_count?: string | null;
  organization_revenue_range?: string | null;
  funding_stage?: string | null;
  total_funding_usd?: number | null;
  buying_intent_signals?: Array<{
    type: string;
    signal: string;
    strength: string;
  }>;
  job_postings?: Array<{
    title: string;
    department?: string;
    posted_date?: string;
  }>;
  technologies_used?: string[];
  inferred_needs?: Array<string | { need: string }>;
  data_completeness_score?: number;
}

export function calculateApolloEnrichedPricing(
  weeks: number,
  hrsPerWeek: number,
  teamSize: number,
  tier: string,
  company: CompanyInfo
): { budget: number; breakdown: any } {
  // Base calculation using student labor rates
  const totalHours = weeks * hrsPerWeek * teamSize;
  const laborRate = 20; // Student rate per hour
  const laborCost = totalHours * laborRate;
  const materials = 300; // Standard materials/tools cost
  
  let budget = laborCost + materials;
  
  const breakdown: any = {
    base_calculation: {
      weeks,
      hours_per_week: hrsPerWeek,
      team_size: teamSize,
      total_hours: totalHours,
      rate_per_hour: laborRate,
      labor_cost: laborCost,
      materials,
      subtotal: budget
    },
    apollo_intelligence_applied: [],
    market_signals_detected: []
  };
  
  // APOLLO-ENRICHED PRICING FACTORS
  
  // 1. BUYING INTENT SIGNALS (from Apollo)
  if (company.buying_intent_signals && Array.isArray(company.buying_intent_signals) && company.buying_intent_signals.length > 0) {
    const highIntentSignals = company.buying_intent_signals.filter((s: any) => 
      s.strength === 'high' || s.strength === 'strong'
    );
    
    if (highIntentSignals.length > 0) {
      const multiplier = 1.20 + (highIntentSignals.length * 0.05);
      budget *= multiplier;
      breakdown.apollo_intelligence_applied.push({
        factor: "High Buying Intent",
        signals: highIntentSignals.map((s: any) => s.signal),
        multiplier,
        rationale: `${highIntentSignals.length} strong buying signals detected via Apollo - company is actively seeking solutions`
      });
      
      highIntentSignals.forEach((signal: any) => {
        breakdown.market_signals_detected.push({
          type: signal.type,
          signal: signal.signal,
          strength: signal.strength
        });
      });
    }
  }
  
  // 2. HIRING VELOCITY (from Apollo job postings)
  if (company.job_postings && Array.isArray(company.job_postings) && company.job_postings.length > 0) {
    const relevantRoles = company.job_postings.length;
    let hiringMultiplier = 1.0;
    
    if (relevantRoles >= 5) {
      hiringMultiplier = 1.25;
    } else if (relevantRoles >= 2) {
      hiringMultiplier = 1.15;
    }
    
    if (hiringMultiplier > 1.0) {
      budget *= hiringMultiplier;
      breakdown.apollo_intelligence_applied.push({
        factor: "Active Hiring",
        open_positions: relevantRoles,
        multiplier: hiringMultiplier,
        rationale: `Company has ${relevantRoles} open positions - high demand for talent and willingness to invest in solutions`
      });
      
      breakdown.market_signals_detected.push({
        type: "hiring_velocity",
        signal: `${relevantRoles} open positions`,
        strength: relevantRoles >= 5 ? 'high' : 'medium'
      });
    }
  }
  
  // 3. FUNDING STAGE & CAPITAL (from Apollo)
  const fundingStage = company.funding_stage;
  const totalFunding = company.total_funding_usd;
  
  if (fundingStage || totalFunding) {
    let fundingMultiplier = 1.0;
    let rationale = "";
    
    // Actual funding amount takes priority
    if (totalFunding && totalFunding > 0) {
      if (totalFunding >= 50000000) { // $50M+
        fundingMultiplier = 1.35;
        rationale = `Well-capitalized ($${(totalFunding/1000000).toFixed(1)}M raised) - premium pricing justified`;
      } else if (totalFunding >= 10000000) { // $10M+
        fundingMultiplier = 1.20;
        rationale = `Strong funding ($${(totalFunding/1000000).toFixed(1)}M raised) - can afford quality consulting`;
      } else if (totalFunding >= 1000000) { // $1M+
        fundingMultiplier = 1.10;
        rationale = `Funded company ($${(totalFunding/1000000).toFixed(1)}M raised)`;
      }
    } else if (fundingStage) {
      // Fallback to stage-based pricing
      const stageMultipliers: Record<string, number> = {
        'Seed': 0.95,
        'Series A': 1.10,
        'Series B': 1.25,
        'Series C': 1.30,
        'Series C+': 1.35,
        'Series D+': 1.40,
        'IPO': 1.50,
        'Public': 1.50,
        'Private Equity': 1.40
      };
      
      if (stageMultipliers[fundingStage]) {
        fundingMultiplier = stageMultipliers[fundingStage];
        rationale = `${fundingStage} funding stage indicates strong financial position`;
      }
    }
    
    if (fundingMultiplier !== 1.0) {
      budget *= fundingMultiplier;
      breakdown.apollo_intelligence_applied.push({
        factor: "Funding & Capital",
        funding_stage: fundingStage,
        total_funding_usd: totalFunding,
        multiplier: fundingMultiplier,
        rationale
      });
      
      breakdown.market_signals_detected.push({
        type: "funding",
        signal: totalFunding ? `$${(totalFunding/1000000).toFixed(1)}M raised` : fundingStage,
        strength: totalFunding && totalFunding >= 50000000 ? 'high' : 'medium'
      });
    }
  }
  
  // 4. TECHNOLOGY STACK COMPLEXITY (from Apollo)
  if (company.technologies_used && Array.isArray(company.technologies_used) && company.technologies_used.length > 0) {
    const advancedTechnologies = [
      'AI', 'ML', 'Machine Learning', 'Artificial Intelligence',
      'Cloud', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker',
      'React', 'Python', 'TensorFlow', 'PyTorch',
      'Blockchain', 'Cryptocurrency', 'IoT', 'Edge Computing',
      'Data Science', 'Big Data', 'Analytics'
    ];
    
    const techMatches = (company.technologies_used || []).filter(tech => {
      // 'tech' is now guaranteed to be a string by the Shield pattern
      return advancedTechnologies.some(advTech => 
        tech.toLowerCase().includes(advTech.toLowerCase())
      );
    });
    
    if (techMatches.length >= 3) {
      budget *= 1.25;
      breakdown.apollo_intelligence_applied.push({
        factor: "Advanced Technology Stack",
        technologies: techMatches,
        multiplier: 1.25,
        rationale: `Company uses ${techMatches.length} cutting-edge technologies - requires specialized expertise`
      });
    } else if (techMatches.length >= 1) {
      budget *= 1.10;
      breakdown.apollo_intelligence_applied.push({
        factor: "Modern Technology Stack",
        technologies: techMatches,
        multiplier: 1.10,
        rationale: "Moderate technology complexity"
      });
    }
  }
  
  // 5. COMPANY SIZE & SCALE (enhanced with Apollo data)
  const employeeCount = company.organization_employee_count || company.size;
  let sizeMultiplier = 1.0;
  let sizeRationale = "";
  
  if (typeof employeeCount === 'string') {
    // Parse Apollo's employee count ranges
    if (employeeCount.includes('10,000+') || employeeCount.includes('5,001-10,000')) {
      sizeMultiplier = 1.30;
      sizeRationale = "Enterprise scale organization";
    } else if (employeeCount.includes('1,001-5,000') || employeeCount.includes('501-1,000')) {
      sizeMultiplier = 1.20;
      sizeRationale = "Large organization";
    } else if (employeeCount.includes('201-500') || employeeCount.includes('101-200')) {
      sizeMultiplier = 1.10;
      sizeRationale = "Mid-size organization";
    } else if (employeeCount.includes('51-100') || employeeCount.includes('26-50')) {
      sizeMultiplier = 1.0;
      sizeRationale = "Small to medium organization";
    } else if (employeeCount.includes('11-25') || employeeCount.includes('1-10')) {
      sizeMultiplier = 0.90;
      sizeRationale = "Small organization - discounted rate for mutual benefit";
    }
  }
  
  if (sizeMultiplier !== 1.0) {
    budget *= sizeMultiplier;
    breakdown.apollo_intelligence_applied.push({
      factor: "Organization Scale",
      employee_count: employeeCount,
      multiplier: sizeMultiplier,
      rationale: sizeRationale
    });
  }
  
  // 6. REVENUE RANGE (from Apollo)
  if (company.organization_revenue_range) {
    let revenueMultiplier = 1.0;
    const revenue = company.organization_revenue_range;
    
    if (revenue.includes('$1B+') || revenue.includes('$500M - $1B')) {
      revenueMultiplier = 1.25;
    } else if (revenue.includes('$100M - $500M')) {
      revenueMultiplier = 1.15;
    } else if (revenue.includes('$50M - $100M')) {
      revenueMultiplier = 1.10;
    }
    
    if (revenueMultiplier > 1.0) {
      budget *= revenueMultiplier;
      breakdown.apollo_intelligence_applied.push({
        factor: "Revenue Scale",
        revenue_range: revenue,
        multiplier: revenueMultiplier,
        rationale: "Strong revenue indicates budget capacity"
      });
    }
  }
  
  // 7. INFERRED STRATEGIC NEEDS (from Apollo)
  if (company.inferred_needs && Array.isArray(company.inferred_needs) && company.inferred_needs.length > 0) {
    const strategicKeywords = [
      'strategic', 'optimization', 'transformation', 'innovation',
      'scale', 'growth', 'expansion', 'market entry', 'competitive advantage',
      'digital transformation', 'modernization', 'efficiency'
    ];
    
    const hasStrategicNeeds = company.inferred_needs.some((need: any) => {
      const needText = typeof need === 'string' ? need : need.need || '';
      return strategicKeywords.some(keyword => 
        needText.toLowerCase().includes(keyword)
      );
    });
    
    if (hasStrategicNeeds) {
      budget *= 1.15;
      breakdown.apollo_intelligence_applied.push({
        factor: "Strategic Initiative",
        multiplier: 1.15,
        rationale: "Project addresses high-impact strategic needs"
      });
    }
  }
  
  budget = Math.round(budget / 100) * 100;
  breakdown.final_budget = budget;
  breakdown.data_enrichment_source = "Apollo.io";
  breakdown.apollo_data_quality = company.data_completeness_score || 0;
  
  return { budget, breakdown };
}

export function calculateApolloEnrichedROI(
  budget: number,
  deliverables: string[],
  company: CompanyInfo,
  tasks: string[]
): any {
  
  let totalValue = budget;
  const valueComponents: any[] = [];
  
  // 1. DELIVERABLE MARKET VALUE (Industry-standard consulting rates)
  const deliverableValues: Record<string, number> = {
    'Market Research Report': 8000,
    'Competitive Analysis': 7000,
    'Financial Model': 12000,
    'Prototype': 25000,
    'MVP': 30000,
    'Dashboard': 15000,
    'Analytics Platform': 20000,
    'Strategy Framework': 10000,
    'Process Optimization': 18000,
    'Business Plan': 9000,
    'Marketing Strategy': 11000,
    'Data Analysis': 6000,
    'Feasibility Study': 8500,
    'Technical Documentation': 5000,
    'User Research': 7500,
    'AI Model': 35000,
    'Data Pipeline': 22000,
    'Integration': 12000
  };
  
  let deliverableValue = 0;
  const deliverableBreakdown: any[] = [];
  
  deliverables.forEach(deliverable => {
    Object.entries(deliverableValues).forEach(([key, value]) => {
      if (deliverable.toLowerCase().includes(key.toLowerCase())) {
        deliverableValue += value;
        deliverableBreakdown.push({
          deliverable,
          market_value: value,
          rationale: `Professional ${key} consulting typically costs $${value.toLocaleString()}`
        });
      }
    });
  });
  
  if (deliverableValue > 0) {
    totalValue += deliverableValue;
    valueComponents.push({
      category: "Professional Deliverables",
      value: deliverableValue,
      weight: 0.35,
      breakdown: deliverableBreakdown
    });
  }
  
  // 2. TALENT PIPELINE VALUE (Apollo hiring data)
  let talentValue = 0;
  if (company.job_postings && Array.isArray(company.job_postings) && company.job_postings.length > 0) {
    const avgRecruitingCost = 8000; // Industry average per hire
    const avgInterviewTime = 2000; // HR time cost per candidate
    const qualifiedCandidates = Math.min(3, company.job_postings.length); // Max 3 students
    
    // Direct recruiting savings
    const recruitingSavings = qualifiedCandidates * avgRecruitingCost * 0.60;
    
    // Pre-vetted talent value
    const preVettedValue = qualifiedCandidates * avgInterviewTime;
    
    talentValue = recruitingSavings + preVettedValue;
    totalValue += talentValue;
    
    valueComponents.push({
      category: "Talent Pipeline Access",
      value: talentValue,
      weight: 0.20,
      breakdown: {
        open_positions: company.job_postings.length,
        qualified_candidates: qualifiedCandidates,
        recruiting_cost_savings: recruitingSavings,
        interview_time_savings: preVettedValue,
        rationale: `${company.job_postings.length} active job openings detected via Apollo - direct pipeline to pre-vetted talent`
      }
    });
  }
  
  // 3. STRATEGIC CONSULTING VALUE (Apollo funding & stage data)
  let strategicValue = 0;
  const fundingAmount = company.total_funding_usd;
  const fundingStage = company.funding_stage;
  
  if (fundingAmount && fundingAmount > 0) {
    // Well-funded companies get significant strategic value
    if (fundingAmount >= 50000000) {
      strategicValue = budget * 0.40; // 40% premium for large funded companies
    } else if (fundingAmount >= 10000000) {
      strategicValue = budget * 0.30;
    } else if (fundingAmount >= 1000000) {
      strategicValue = budget * 0.20;
    }
  } else if (fundingStage && ['Series B', 'Series C', 'Series C+', 'Series D+', 'IPO', 'Public'].includes(fundingStage)) {
    strategicValue = budget * 0.25;
  }
  
  if (strategicValue > 0) {
    totalValue += strategicValue;
    valueComponents.push({
      category: "Strategic Innovation Consulting",
      value: strategicValue,
      weight: 0.15,
      breakdown: {
        funding_stage: fundingStage,
        total_funding: fundingAmount,
        rationale: fundingAmount 
          ? `$${(fundingAmount/1000000).toFixed(1)}M funded companies benefit from external innovation perspectives`
          : `${fundingStage} companies gain competitive advantage from academic research insights`
      }
    });
  }
  
  // 4. TECHNOLOGY TRANSFER VALUE (Apollo tech stack data)
  let techTransferValue = 0;
  if (company.technologies_used && Array.isArray(company.technologies_used) && company.technologies_used.length > 0) {
    techTransferValue = budget * 0.25; // 25% value from latest academic methodologies
    totalValue += techTransferValue;
    
    valueComponents.push({
      category: "Academic Research & Technology Transfer",
      value: techTransferValue,
      weight: 0.15,
      breakdown: {
        technologies: company.technologies_used,
        rationale: "Students bring cutting-edge academic research and modern development practices"
      }
    });
  } else {
    // Generic knowledge transfer even without specific tech stack
    techTransferValue = budget * 0.15;
    totalValue += techTransferValue;
    
    valueComponents.push({
      category: "Knowledge Transfer",
      value: techTransferValue,
      weight: 0.15,
      breakdown: {
        rationale: "Access to latest academic research and fresh perspectives"
      }
    });
  }
  
  // 5. MARKET INTELLIGENCE VALUE (Apollo buying signals)
  let marketIntelValue = 0;
  if (company.buying_intent_signals && Array.isArray(company.buying_intent_signals) && company.buying_intent_signals.length > 0) {
    const highValueSignals = company.buying_intent_signals.filter((s: any) => 
      s.strength === 'high' || s.strength === 'strong'
    );
    
    if (highValueSignals.length > 0) {
      marketIntelValue = 5000 * highValueSignals.length;
      totalValue += marketIntelValue;
      
      valueComponents.push({
        category: "Market-Validated Opportunity",
        value: marketIntelValue,
        weight: 0.10,
        breakdown: {
          signals: highValueSignals.map((s: any) => s.signal),
          rationale: `${highValueSignals.length} strong buying signals indicate high business need and urgency`
        }
      });
    }
  }
  
  // 6. RISK MITIGATION VALUE
  const riskMitigationValue = budget * 0.10; // 10% value from low-risk pilot
  totalValue += riskMitigationValue;
  
  valueComponents.push({
    category: "Risk-Free Pilot Program",
    value: riskMitigationValue,
    weight: 0.05,
    breakdown: {
      rationale: "Test solutions and team fit before full-time hiring commitments"
    }
  });
  
  return {
    project_cost: budget,
    total_value: Math.round(totalValue),
    roi_multiplier: parseFloat((totalValue / budget).toFixed(2)),
    net_value: Math.round(totalValue - budget),
    value_components: valueComponents,
    data_source: "Apollo.io Market Intelligence",
    apollo_signals_used: {
      job_postings: company.job_postings?.length || 0,
      buying_intent_signals: company.buying_intent_signals?.length || 0,
      technologies_tracked: company.technologies_used?.length || 0,
      funding_data: !!(company.total_funding_usd || company.funding_stage)
    }
  };
}
