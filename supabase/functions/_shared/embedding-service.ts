/**
 * Embedding Service - Gemini API Implementation
 *
 * Provides high-quality text embeddings using Google Gemini's text-embedding-004 model.
 * Replaces broken WASM-based @xenova/transformers with reliable API-based embeddings.
 *
 * Features:
 * - Batch embedding support (100 texts per call)
 * - In-memory caching with 1-hour TTL
 * - Circuit breaker for automatic fallback
 * - 768-dimensional embeddings for semantic similarity
 *
 * Part of P0-4 Phase 3: Enhanced semantic matching
 */

// ========================================
// CONFIGURATION
// ========================================
const GEMINI_MODEL = 'text-embedding-004';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_BATCH_SIZE = 100; // Gemini batch limit
const MAX_TEXT_LENGTH = 2048; // Gemini text limit per input

// ========================================
// CIRCUIT BREAKER STATE
// ========================================
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;
let circuitOpen = false;
let circuitOpenedAt: number | null = null;
const CIRCUIT_RESET_TIME_MS = 60000; // 1 minute

// ========================================
// EMBEDDING CACHE (1-hour TTL)
// ========================================
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if circuit breaker should allow requests
 */
function isCircuitClosed(): boolean {
  if (!circuitOpen) return true;
  
  // Check if circuit should reset
  if (circuitOpenedAt && Date.now() - circuitOpenedAt > CIRCUIT_RESET_TIME_MS) {
    console.log('🔄 [Embeddings] Circuit breaker reset - retrying Gemini API');
    circuitOpen = false;
    circuitOpenedAt = null;
    consecutiveFailures = 0;
    return true;
  }
  
  return false;
}

/**
 * Record API failure for circuit breaker
 */
function recordFailure(error: Error): void {
  consecutiveFailures++;
  console.warn(`⚠️  [Embeddings] Gemini API failure #${consecutiveFailures}: ${error.message}`);
  
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpen = true;
    circuitOpenedAt = Date.now();
    console.error(`🔴 [Embeddings] Circuit breaker OPEN - falling back to keywords for ${CIRCUIT_RESET_TIME_MS / 1000}s`);
  }
}

/**
 * Record API success - reset circuit breaker
 */
function recordSuccess(): void {
  if (consecutiveFailures > 0) {
    console.log('✅ [Embeddings] Gemini API recovered - circuit breaker reset');
  }
  consecutiveFailures = 0;
  circuitOpen = false;
  circuitOpenedAt = null;
}

/**
 * Check if embedding service is available
 */
export function isEmbeddingServiceAvailable(): boolean {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  return !!apiKey && isCircuitClosed();
}

/**
 * Get cache key for text
 */
function getCacheKey(text: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `gemini_${hash}_${text.length}`;
}

/**
 * Check cache for embedding
 */
function getCachedEmbedding(text: string): number[] | null {
  const cacheKey = getCacheKey(text);
  const cached = embeddingCache.get(cacheKey);
  
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL_MS) {
      return cached.embedding;
    }
    embeddingCache.delete(cacheKey);
  }
  
  return null;
}

/**
 * Store embedding in cache
 */
function cacheEmbedding(text: string, embedding: number[]): void {
  const cacheKey = getCacheKey(text);
  embeddingCache.set(cacheKey, {
    embedding,
    timestamp: Date.now()
  });
}

/**
 * Truncate text to Gemini's limit
 */
function truncateText(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'empty text placeholder';
  }
  return text.slice(0, MAX_TEXT_LENGTH);
}

/**
 * Compute embedding for a single text using Gemini API
 */
export async function computeEmbedding(text: string): Promise<number[]> {
  // Check circuit breaker
  if (!isCircuitClosed()) {
    throw new Error('Circuit breaker open - Gemini API temporarily disabled');
  }

  // Check cache first
  const truncated = truncateText(text);
  const cached = getCachedEmbedding(truncated);
  if (cached) {
    return cached;
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GEMINI_MODEL}`,
          content: { parts: [{ text: truncated }] }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Gemini');
    }

    // Cache and return
    cacheEmbedding(truncated, embedding);
    recordSuccess();
    
    return embedding;
  } catch (error) {
    recordFailure(error as Error);
    throw error;
  }
}

/**
 * Compute embeddings for multiple texts in a single batch API call
 * Much more efficient than individual calls
 */
export async function computeBatchEmbeddings(texts: string[]): Promise<number[][]> {
  // Check circuit breaker
  if (!isCircuitClosed()) {
    throw new Error('Circuit breaker open - Gemini API temporarily disabled');
  }

  if (texts.length === 0) {
    return [];
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Truncate all texts
  const truncatedTexts = texts.map(truncateText);
  
  // Check cache for all texts
  const results: (number[] | null)[] = truncatedTexts.map(t => getCachedEmbedding(t));
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];
  
  results.forEach((result, i) => {
    if (result === null) {
      uncachedIndices.push(i);
      uncachedTexts.push(truncatedTexts[i]);
    }
  });

  // If all cached, return immediately
  if (uncachedTexts.length === 0) {
    console.log(`  ⚡ [Embeddings] 100% cache hit (${texts.length} texts)`);
    return results as number[][];
  }

  console.log(`  🔄 [Embeddings] Computing ${uncachedTexts.length} embeddings (${texts.length - uncachedTexts.length} cached)`);
  const startTime = Date.now();

  try {
    // Process in batches of MAX_BATCH_SIZE
    const batchedEmbeddings: number[][] = [];
    
    for (let i = 0; i < uncachedTexts.length; i += MAX_BATCH_SIZE) {
      const batch = uncachedTexts.slice(i, i + MAX_BATCH_SIZE);
      
      // Use batchEmbedContents for efficiency
      const response = await fetch(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:batchEmbedContents?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: batch.map(text => ({
              model: `models/${GEMINI_MODEL}`,
              content: { parts: [{ text }] }
            }))
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini batch API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error('Invalid batch embedding response from Gemini');
      }

      for (const emb of data.embeddings) {
        if (!emb.values || !Array.isArray(emb.values)) {
          throw new Error('Invalid embedding in batch response');
        }
        batchedEmbeddings.push(emb.values);
      }
    }

    // Cache new embeddings and fill results
    for (let i = 0; i < uncachedIndices.length; i++) {
      const originalIndex = uncachedIndices[i];
      const embedding = batchedEmbeddings[i];
      results[originalIndex] = embedding;
      cacheEmbedding(truncatedTexts[originalIndex], embedding);
    }

    recordSuccess();
    
    const processingTime = Date.now() - startTime;
    console.log(`  ✅ [Embeddings] Batch complete: ${uncachedTexts.length} embeddings in ${processingTime}ms (${(processingTime / uncachedTexts.length).toFixed(0)}ms/text)`);

    return results as number[][];
  } catch (error) {
    recordFailure(error as Error);
    throw error;
  }
}

/**
 * Compute cosine similarity between two embedding vectors
 * Returns value between -1 and 1 (typically 0 to 1 for normalized vectors)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`Vector length mismatch: ${vec1.length} vs ${vec2.length}`);
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
 * Compute semantic similarity between two texts using Gemini embeddings
 * Main entry point for similarity computation
 */
export async function computeSemanticSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  const startTime = Date.now();

  // Compute embeddings for both texts (batch for efficiency)
  const [embedding1, embedding2] = await computeBatchEmbeddings([text1, text2]);

  // Compute cosine similarity
  const similarity = cosineSimilarity(embedding1, embedding2);

  const processingTime = Date.now() - startTime;
  console.log(`  ⚡ [Embeddings] Similarity: ${(similarity * 100).toFixed(1)}% (${processingTime}ms)`);

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Compute similarities between one course text and multiple company texts
 * Optimized batch processing - computes course embedding once
 */
export async function computeBatchSimilarities(
  courseText: string,
  companyTexts: string[]
): Promise<number[]> {
  if (companyTexts.length === 0) {
    return [];
  }

  const startTime = Date.now();
  console.log(`\n🧮 [Embeddings] Computing batch similarities for ${companyTexts.length} companies...`);

  // Batch all texts together (course + all companies)
  const allTexts = [courseText, ...companyTexts];
  const allEmbeddings = await computeBatchEmbeddings(allTexts);

  // Course embedding is first
  const courseEmbedding = allEmbeddings[0];
  
  // Compute similarities
  const similarities: number[] = [];
  for (let i = 1; i < allEmbeddings.length; i++) {
    const similarity = cosineSimilarity(courseEmbedding, allEmbeddings[i]);
    similarities.push(Math.max(0, Math.min(1, similarity)));
  }

  const processingTime = Date.now() - startTime;
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  console.log(`  ✅ [Embeddings] Batch complete: ${companyTexts.length} similarities in ${processingTime}ms`);
  console.log(`     Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);

  return similarities;
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
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(): { 
  isOpen: boolean; 
  failures: number; 
  threshold: number;
  resetInMs: number | null;
} {
  return {
    isOpen: circuitOpen,
    failures: consecutiveFailures,
    threshold: CIRCUIT_BREAKER_THRESHOLD,
    resetInMs: circuitOpen && circuitOpenedAt 
      ? Math.max(0, CIRCUIT_RESET_TIME_MS - (Date.now() - circuitOpenedAt))
      : null
  };
}

/**
 * Health check - verify Gemini API is working
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
