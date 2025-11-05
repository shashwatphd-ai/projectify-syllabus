# Modular Discovery System

A plugin-based architecture for company discovery using the **Strategy Pattern**.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         discover-companies/             │
│              index.ts                   │
│    (Main orchestrator - provider       │
│         agnostic)                       │
└────────────────┬────────────────────────┘
                 │
                 │ Uses
                 ▼
┌─────────────────────────────────────────┐
│        ProviderFactory                  │
│  - Selects provider based on config    │
│  - Handles fallback logic              │
│  - Performs health checks              │
└────────────────┬────────────────────────┘
                 │
                 │ Creates
                 ▼
┌─────────────────────────────────────────┐
│       DiscoveryProvider Interface       │
│  - discover(context): Promise<Result>  │
│  - isConfigured(): boolean             │
│  - healthCheck(): Promise<boolean>     │
│  - getRequiredSecrets(): string[]      │
└────────────────┬────────────────────────┘
                 │
                 │ Implemented by
                 ▼
┌─────────────┬──────────────┬────────────┐
│   Apollo    │   Google     │   Hybrid   │
│  Provider   │  Provider    │  Provider  │
│             │  (Future)    │  (Future)  │
└─────────────┴──────────────┴────────────┘
```

## File Structure

```
supabase/functions/discover-companies/
├── index.ts                          # Main entry point
├── README.md                         # This file
└── providers/
    ├── types.ts                      # Shared interfaces
    ├── provider-factory.ts           # Provider management
    ├── apollo-provider.ts            # Apollo.io implementation
    └── google-provider.ts            # Google Places (future)
```

## Best Practices Implemented

### 1. **Strategy Pattern**
- Each provider implements the `DiscoveryProvider` interface
- Providers are interchangeable at runtime
- No conditional logic in main code based on provider type

### 2. **SOLID Principles**

**Single Responsibility:**
- `ProviderFactory` - Provider selection and initialization
- `ApolloProvider` - Apollo.io specific logic
- `index.ts` - Request handling and data storage

**Open/Closed:**
- Open for extension (add new providers)
- Closed for modification (existing code unchanged)

**Liskov Substitution:**
- All providers can substitute each other
- Same interface guarantees

**Interface Segregation:**
- Minimal interface with only essential methods

**Dependency Inversion:**
- Depends on `DiscoveryProvider` interface, not concrete implementations

### 3. **Configuration Over Code**
- Switch providers via environment variable
- No code changes needed to change behavior

### 4. **Graceful Degradation**
- Automatic fallback if primary provider fails
- Health checks before usage
- Clear error messages

## Configuration

### Environment Variables

```bash
# Primary discovery provider
DISCOVERY_PROVIDER=apollo              # Options: apollo, google, hybrid

# Fallback provider (optional)
FALLBACK_PROVIDER=google               # Used if primary fails

# Retry and timeout settings
MAX_RETRIES=3
DISCOVERY_TIMEOUT=300000               # 5 minutes in ms
```

### Provider-Specific Secrets

**Apollo Provider:**
```bash
APOLLO_API_KEY=your_apollo_key
LOVABLE_API_KEY=your_lovable_key       # For AI filter generation
```

**Google Provider (Future):**
```bash
GOOGLE_PLACES_API_KEY=your_google_key
GEMINI_API_KEY=your_gemini_key
```

## How It Works

### 1. Request Flow

```typescript
// 1. Main function receives request
const { courseId, location, count } = await req.json();

// 2. Get provider config from environment
const config = ProviderFactory.getConfigFromEnv();

// 3. Factory selects and validates provider
const provider = await ProviderFactory.getProvider(config);

// 4. Provider discovers companies
const result = await provider.discover({
  outcomes,
  level,
  topics,
  location,
  targetCount: count
});

// 5. Store results in database
// ... storage logic
```

### 2. Adding a New Provider

**Step 1:** Create provider file

```typescript
// providers/clearbit-provider.ts
import { DiscoveryProvider, CourseContext, DiscoveryResult } from './types.ts';

export class ClearbitProvider implements DiscoveryProvider {
  readonly name = 'Clearbit';
  readonly version = '1.0.0';
  
  isConfigured(): boolean {
    return !!Deno.env.get('CLEARBIT_API_KEY');
  }
  
  getRequiredSecrets(): string[] {
    return ['CLEARBIT_API_KEY'];
  }
  
  async healthCheck(): Promise<boolean> {
    // Test API connection
    return true;
  }
  
  async discover(context: CourseContext): Promise<DiscoveryResult> {
    // Implement Clearbit-specific discovery logic
    // Return standardized DiscoveryResult
  }
}
```

**Step 2:** Register in factory

```typescript
// providers/provider-factory.ts
import { ClearbitProvider } from './clearbit-provider.ts';

private static initializeProviders(): void {
  this.register('apollo', new ApolloProvider());
  this.register('clearbit', new ClearbitProvider()); // Add this
}
```

**Step 3:** Use it

```bash
DISCOVERY_PROVIDER=clearbit
CLEARBIT_API_KEY=your_key
```

That's it! No changes to main code needed.

## Provider Comparison

| Feature | Apollo | Google (Future) | Hybrid (Future) |
|---------|--------|-----------------|-----------------|
| Company Search | ✅ Advanced filters | ✅ Location-based | ✅ Best of both |
| Contact Discovery | ✅ Decision makers | ⚠️ Limited | ✅ Multi-source |
| Market Intelligence | ✅ Jobs, funding | ❌ None | ✅ Comprehensive |
| Cost | $$$ High | $ Low | $$ Medium |
| Data Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Setup Complexity | Medium | Low | High |

## Testing

### Test Provider Configuration

```typescript
// List all providers and their status
const providers = await ProviderFactory.listProviders();
console.log(providers);

// Output:
// [
//   {
//     name: 'Apollo.io',
//     version: '1.0.0',
//     configured: true,
//     healthy: true,
//     requiredSecrets: ['APOLLO_API_KEY', 'LOVABLE_API_KEY']
//   }
// ]
```

### Test Provider Fallback

```bash
# Primary provider not configured
DISCOVERY_PROVIDER=google
FALLBACK_PROVIDER=apollo
APOLLO_API_KEY=your_key

# Result: Falls back to Apollo
```

## Benefits of This Architecture

### 1. **Modularity**
- Each provider is self-contained
- Easy to test in isolation
- No tight coupling

### 2. **Maintainability**
- Clear separation of concerns
- Easy to understand and debug
- Minimal side effects

### 3. **Extensibility**
- Add new providers without modifying existing code
- Implement hybrid strategies
- Support multiple API versions

### 4. **Reliability**
- Automatic fallback
- Health checks prevent failures
- Graceful error handling

### 5. **Flexibility**
- Switch providers per environment
- A/B test different providers
- Mix and match for different courses

## Future Enhancements

### Hybrid Provider
Combine multiple providers for best results:

```typescript
export class HybridProvider implements DiscoveryProvider {
  async discover(context: CourseContext): Promise<DiscoveryResult> {
    // 1. Use Google for initial discovery (cheap, broad)
    const googleResults = await googleProvider.discover(context);
    
    // 2. Use Apollo for enrichment (expensive, detailed)
    const enriched = await apolloProvider.enrich(googleResults);
    
    // 3. Merge and deduplicate
    return mergeResults(googleResults, enriched);
  }
}
```

### Smart Provider Selection
AI-driven provider selection based on course type:

```typescript
export class SmartProvider implements DiscoveryProvider {
  async discover(context: CourseContext): Promise<DiscoveryResult> {
    // Analyze course context
    const providerToUse = this.selectBestProvider(context);
    
    // Use selected provider
    return providerToUse.discover(context);
  }
  
  private selectBestProvider(context: CourseContext): DiscoveryProvider {
    // Tech courses -> Apollo (better tech company data)
    // Business courses -> Google (broader coverage)
    // Healthcare courses -> Specialized provider
  }
}
```

## Troubleshooting

### Provider Not Configured

```
Error: Provider 'apollo' not configured. Missing secrets: APOLLO_API_KEY, LOVABLE_API_KEY
```

**Solution:** Add required environment variables

### Health Check Failed

```
⚠️ Provider 'apollo' failed health check
✓ Using healthy fallback provider: google
```

**Solution:** Check API credentials and connectivity

### No Providers Available

```
Error: Provider 'apollo' not found
```

**Solution:** Check `DISCOVERY_PROVIDER` environment variable spelling

## References

- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Plugin Architecture](https://martinfowler.com/articles/plugins.html)
