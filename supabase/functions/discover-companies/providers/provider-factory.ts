import { DiscoveryProvider, ProviderConfig } from './types.ts';
import { ApolloProvider } from './apollo-provider.ts';
import { AdzunaProvider } from './adzuna-provider.ts';

/**
 * PROVIDER FACTORY
 * Creates and manages discovery providers with fallback support
 */
export class ProviderFactory {
  private static providers: Map<string, DiscoveryProvider> = new Map();
  
  /**
   * Register a provider
   */
  static register(name: string, provider: DiscoveryProvider): void {
    this.providers.set(name, provider);
    console.log(`✓ Registered provider: ${name}`);
  }
  
  /**
   * Get a configured provider based on config
   */
  static async getProvider(config: ProviderConfig): Promise<DiscoveryProvider> {
    // Initialize providers if not already done
    if (this.providers.size === 0) {
      this.initializeProviders();
    }
    
    // Try primary provider
    const primaryProvider = this.providers.get(config.provider);
    
    if (!primaryProvider) {
      throw new Error(`Provider '${config.provider}' not found`);
    }
    
    // Check if configured
    if (!primaryProvider.isConfigured()) {
      const missingSecrets = primaryProvider.getRequiredSecrets();
      
      // Try fallback if available
      if (config.fallbackProvider) {
        console.log(`⚠️ Primary provider '${config.provider}' not configured. Trying fallback: ${config.fallbackProvider}`);
        
        const fallbackProvider = this.providers.get(config.fallbackProvider);
        
        if (fallbackProvider && fallbackProvider.isConfigured()) {
          console.log(`✓ Using fallback provider: ${config.fallbackProvider}`);
          return fallbackProvider;
        }
      }
      
      throw new Error(
        `Provider '${config.provider}' not configured. Missing secrets: ${missingSecrets.join(', ')}`
      );
    }
    
    // Health check
    const isHealthy = await primaryProvider.healthCheck();
    if (!isHealthy) {
      console.warn(`⚠️ Provider '${config.provider}' failed health check`);
      
      if (config.fallbackProvider) {
        const fallbackProvider = this.providers.get(config.fallbackProvider);
        if (fallbackProvider) {
          const fallbackHealthy = await fallbackProvider.healthCheck();
          if (fallbackHealthy) {
            console.log(`✓ Using healthy fallback provider: ${config.fallbackProvider}`);
            return fallbackProvider;
          }
        }
      }
      
      // Continue with primary even if unhealthy (might be temporary)
      console.log(`⚠️ Proceeding with primary provider despite health check failure`);
    }
    
    return primaryProvider;
  }
  
  /**
   * Initialize all available providers
   */
  private static initializeProviders(): void {
    console.log('🔧 Initializing discovery providers...');

    // Register Apollo provider
    this.register('apollo', new ApolloProvider());

    // Register Adzuna provider (job-based discovery)
    this.register('adzuna', new AdzunaProvider());

    // Future providers can be added here:
    // this.register('google', new GoogleProvider());
    // this.register('clearbit', new ClearbitProvider());

    console.log(`✓ Initialized ${this.providers.size} providers`);
  }
  
  /**
   * List all registered providers with their status
   */
  static async listProviders(): Promise<Array<{
    name: string;
    version: string;
    configured: boolean;
    healthy: boolean;
    requiredSecrets: string[];
  }>> {
    if (this.providers.size === 0) {
      this.initializeProviders();
    }
    
    const status = [];
    
    for (const [key, provider] of this.providers) {
      const configured = provider.isConfigured();
      const healthy = configured ? await provider.healthCheck() : false;
      
      status.push({
        name: provider.name,
        version: provider.version,
        configured,
        healthy,
        requiredSecrets: provider.getRequiredSecrets()
      });
    }
    
    return status;
  }
  
  /**
   * Get provider configuration from environment or defaults
   */
  static getConfigFromEnv(): ProviderConfig {
    const providerName = (Deno.env.get('DISCOVERY_PROVIDER') || 'apollo') as 'apollo' | 'google' | 'adzuna' | 'hybrid';
    const fallbackName = Deno.env.get('FALLBACK_PROVIDER') as 'apollo' | 'google' | 'adzuna' | undefined;

    return {
      provider: providerName,
      fallbackProvider: fallbackName,
      maxRetries: parseInt(Deno.env.get('MAX_RETRIES') || '3'),
      timeout: parseInt(Deno.env.get('DISCOVERY_TIMEOUT') || '300000') // 5 minutes default
    };
  }
}
