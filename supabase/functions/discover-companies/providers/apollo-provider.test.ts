import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ApolloProvider } from "./apollo-provider.ts";
import type { CourseContext, DiscoveredCompany } from "./types.ts";

// Mock raw Apollo API response with messy data (technologies as objects)
const mockApolloResponse = {
  people: [
    {
      id: "apollo-123",
      name: "Jane Smith",
      title: "VP of Engineering",
      email: "jane.smith@techcorp.com",
      organization: {
        id: "org-456",
        name: "TechCorp Solutions",
        website_url: "https://techcorp.com",
        linkedin_url: "https://linkedin.com/company/techcorp",
        primary_phone: {
          number: "+1-555-0100"
        },
        industry: "Computer Software",
        keywords: ["saas", "cloud", "enterprise"],
        estimated_num_employees: 250,
        retail_location_count: 0,
        founded_year: 2015,
        publicly_traded_symbol: null,
        current_technologies: [
          { uid: "react", name: "React", category: "frontend" },
          { uid: "node", name: "Node.js", category: "backend" },
          { uid: "aws", name: "AWS", category: "cloud" }
        ],
        short_description: "Enterprise SaaS platform for data analytics"
      }
    }
  ],
  pagination: {
    total_entries: 1,
    page: 1,
    per_page: 10,
    total_pages: 1
  }
};

// Test: Shield Pattern - Normalize messy Apollo data
Deno.test("ApolloProvider - Shield Pattern: normalizes technologies_used to string[]", async () => {
  const provider = new ApolloProvider();
  
  // Mock the internal Apollo API call
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockApolloResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const courseContext: CourseContext = {
      outcomes: ["Build scalable web applications"],
      level: "Advanced",
      topics: ["React", "Node.js"],
      location: "San Francisco, CA",
      targetCount: 1
    };

    const result = await provider.discover(courseContext);

    // CRITICAL ASSERTION: technologiesUsed MUST be string[]
    assertEquals(result.companies.length, 1);
    const company = result.companies[0];
    
    assertExists(company.technologiesUsed);
    assertEquals(Array.isArray(company.technologiesUsed), true);
    
    // Every element must be a string
    company.technologiesUsed!.forEach((tech: unknown) => {
      assertEquals(typeof tech, "string", `Expected string but got ${typeof tech}`);
    });

    // Verify specific normalized values
    assertEquals(company.technologiesUsed!.includes("React"), true);
    assertEquals(company.technologiesUsed!.includes("Node.js"), true);
    assertEquals(company.technologiesUsed!.includes("AWS"), true);

    // Verify no objects leaked through
    const hasObjects = company.technologiesUsed!.some((tech: unknown) => typeof tech === "object");
    assertEquals(hasObjects, false, "technologiesUsed must NOT contain objects");

  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Test: Shield Pattern - Handles missing technologies gracefully
Deno.test("ApolloProvider - Shield Pattern: handles missing technologies as empty array", async () => {
  const provider = new ApolloProvider();
  
  const responseWithoutTech = {
    people: [{
      ...mockApolloResponse.people[0],
      organization: {
        ...mockApolloResponse.people[0].organization,
        current_technologies: null
      }
    }],
    pagination: mockApolloResponse.pagination
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(responseWithoutTech), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const courseContext: CourseContext = {
      outcomes: ["Test"],
      level: "Advanced",
      topics: [],
      location: "SF",
      targetCount: 1
    };

    const result = await provider.discover(courseContext);
    const company = result.companies[0];

    // Should default to empty array, not null or undefined
    assertExists(company.technologiesUsed);
    assertEquals(Array.isArray(company.technologiesUsed), true);
    assertEquals(company.technologiesUsed!.length, 0);

  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Test: Data Contract Compliance - Verify CleanCompanyProfile structure
Deno.test("ApolloProvider - Data Contract: outputs compliant CleanCompanyProfile", async () => {
  const provider = new ApolloProvider();
  
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockApolloResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const courseContext: CourseContext = {
      outcomes: ["Test"],
      level: "Advanced",
      topics: [],
      location: "SF",
      targetCount: 1
    };

    const result = await provider.discover(courseContext);
    const company: DiscoveredCompany = result.companies[0];

    // Verify all required DiscoveredCompany fields exist
    assertExists(company.name);
    assertExists(company.sector);
    assertExists(company.technologiesUsed);
    assertExists(company.discoverySource);
    assertExists(company.enrichmentLevel);

    // Verify types
    assertEquals(typeof company.name, "string");
    assertEquals(typeof company.sector, "string");
    assertEquals(Array.isArray(company.technologiesUsed), true);
    assertEquals(typeof company.discoverySource, "string");
    assertEquals(company.discoverySource, "apollo"); // Apollo provider must tag source

    // Verify enrichment metadata
    assertEquals(company.enrichmentLevel, "apollo_verified");
    assertExists(company.lastEnrichedAt);
    assertExists(company.contactPerson);

  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log("✅ All Shield Pattern tests configured - run with: deno test apollo-provider.test.ts");
