/**
 * Embedding Service
 *
 * Provides Sentence-BERT embeddings for semantic similarity matching.
 * Uses @xenova/transformers with all-MiniLM-L6-v2 model.
 *
 * Features:
 * - Semantic understanding (synonyms, paraphrases)
 * - Context-aware matching
 * - Local model (no API costs)
 * - Caching for performance
 *
 * Part of P0-4 Phase 3: Enhanced semantic matching
 */

// Model singleton
let embeddingModel: any = null;
let modelLoadError: Error | null = null;

// Embedding cache (in-memory, 1 hour TTL)
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Initialize the Sentence-BERT model
 * Model: all-MiniLM-L6-v2 (23MB, optimized for semantic similarity)
 */
async function initializeModel(): Promise<any> {
  if (embeddingModel) {
    return embeddingModel;
  }

  if (modelLoadError) {
    throw modelLoadError;
  }

  try {
    console.log('🔄 [Embeddings] Loading Sentence-BERT model (all-MiniLM-L6-v2)...');
    const startTime = Date.now();

    // Dynamic import to avoid loading if feature is disabled
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');

    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        quantized: true, // Use quantized version for smaller size and faster inference
      }
    );

    const loadTime = Date.now() - startTime;
    console.log(`✅ [Embeddings] Model loaded successfully in ${loadTime}ms`);

    return embeddingModel;
  } catch (error) {
    modelLoadError = error as Error;
    console.error('❌ [Embeddings] Failed to load model:', error);
    throw error;
  }
}

/**
 * Check if embeddings are available
 */
export function isEmbeddingServiceAvailable(): boolean {
  return embeddingModel !== null && modelLoadError === null;
}

/**
 * Compute embedding for a text string
 * Returns normalized embedding vector
 */
export async function computeEmbedding(text: string): Promise<number[]> {
  // Input validation
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Truncate very long text (model limit: 512 tokens ≈ 2000 chars)
  const truncatedText = text.slice(0, 2000);

  // Check cache
  const cacheKey = truncatedText;
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL_MS) {
      return cached.embedding;
    } else {
      embeddingCache.delete(cacheKey);
    }
  }

  // Get model
  const model = await initializeModel();

  // Generate embedding
  const output = await model(truncatedText, {
    pooling: 'mean',      // Mean pooling for sentence embedding
    normalize: true       // L2 normalization
  });

  // Convert to regular array
  const embedding = Array.from(output.data as Float32Array);

  // Cache result
  embeddingCache.set(cacheKey, {
    embedding,
    timestamp: Date.now()
  });

  return embedding;
}

/**
 * Compute cosine similarity between two embedding vectors
 * Returns value between -1 and 1 (typically 0 to 1 for normalized vectors)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude1 = Math.sqrt(norm1);
  const magnitude2 = Math.sqrt(norm2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Compute semantic similarity between two texts using embeddings
 * Main entry point for similarity computation
 */
export async function computeSemanticSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  const startTime = Date.now();

  try {
    // Compute embeddings for both texts
    const [embedding1, embedding2] = await Promise.all([
      computeEmbedding(text1),
      computeEmbedding(text2)
    ]);

    // Compute cosine similarity
    const similarity = cosineSimilarity(embedding1, embedding2);

    const processingTime = Date.now() - startTime;
    console.log(`  ⚡ [Embeddings] Computed similarity in ${processingTime}ms: ${similarity.toFixed(3)}`);

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error('❌ [Embeddings] Similarity computation failed:', error);
    throw error;
  }
}

/**
 * Clear embedding cache (useful for testing or memory management)
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  console.log('🗑️  [Embeddings] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxAge: number } {
  let maxAge = 0;
  const now = Date.now();

  for (const { timestamp } of embeddingCache.values()) {
    const age = now - timestamp;
    if (age > maxAge) {
      maxAge = age;
    }
  }

  return {
    size: embeddingCache.size,
    maxAge: Math.round(maxAge / 1000) // seconds
  };
}

/**
 * Health check - verify model can be loaded and embeddings work
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const testText = "This is a test sentence for health check.";
    const embedding = await computeEmbedding(testText);
    return embedding.length > 0;
  } catch (error) {
    console.error('❌ [Embeddings] Health check failed:', error);
    return false;
  }
}
