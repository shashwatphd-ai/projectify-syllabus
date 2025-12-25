import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verifies the JWT token from the Authorization header
 * Returns the authenticated user's ID if valid
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return { authenticated: false, error: 'Invalid Authorization header format' };
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth-middleware] Missing Supabase environment variables');
    return { authenticated: false, error: 'Server configuration error' };
  }
  
  try {
    // Create client with the user's token to verify it
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('[auth-middleware] Token verification failed:', error?.message);
      return { authenticated: false, error: 'Invalid or expired token' };
    }
    
    return { authenticated: true, userId: user.id };
  } catch (err) {
    console.error('[auth-middleware] Auth error:', err);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Creates an unauthorized response with proper CORS headers
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
