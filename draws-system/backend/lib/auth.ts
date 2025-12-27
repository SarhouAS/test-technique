import jwt from 'jsonwebtoken';
import { query } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'restaurant' | 'admin';
  business_id: string | null;
  is_active: boolean;
}

export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Récupère le secret JWT depuis les variables d'environnement.
 * Utilise SUPABASE_SERVICE_KEY ou JWT_SECRET.
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) {
    throw new Error('JWT_SECRET or SUPABASE_SERVICE_KEY environment variable is not set');
  }
  return secret;
}

/**
 * Extrait le token JWT du header Authorization.
 * @param authHeader - Le header Authorization (format: "Bearer <token>")
 * @returns Le token JWT
 */
function extractToken(authHeader?: string | string[]): string {
  if (!authHeader) {
    throw new Error('Authorization header is missing');
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const parts = headerValue.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('Invalid Authorization header format');
  }

  return parts[1];
}

/**
 * Décode et valide un token JWT.
 * @param token - Le token JWT
 * @returns Les données du token
 */
function decodeToken(token: string): Record<string, unknown> {
  try {
    const secret = getJWTSecret();
    return jwt.verify(token, secret) as Record<string, unknown>;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Récupère l'utilisateur depuis la base de données.
 * @param userId - L'ID de l'utilisateur
 * @returns L'utilisateur ou null
 */
async function getUserFromDB(userId: string): Promise<AuthUser | null> {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0] as AuthUser;
  } catch (error) {
    console.error('Error fetching user from DB:', error);
    return null;
  }
}

/**
 * Authentifie une requête HTTP en vérifiant le token JWT.
 * @param req - La requête HTTP
 * @returns L'utilisateur authentifié
 */
export async function authenticate(req: AuthRequest): Promise<AuthUser> {
  try {
    const token = extractToken(req.headers.authorization);
    const decoded = decodeToken(token);

    // Récupère l'ID de l'utilisateur depuis le token
    const userId = decoded.sub || decoded.user_id || decoded.id;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID not found in token');
    }

    // Récupère l'utilisateur depuis la base de données
    const user = await getUserFromDB(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Vérifie que l'utilisateur est actif
    if (!user.is_active) {
      throw new Error('User is not active');
    }

    return user;
  } catch (error) {
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Vérifie que l'utilisateur a un rôle spécifique.
 * @param user - L'utilisateur
 * @param role - Le rôle requis
 */
export function requireRole(user: AuthUser, role: string | string[]): void {
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    throw new Error(`User role must be one of: ${roles.join(', ')}`);
  }
}

/**
 * Vérifie que l'utilisateur a un business_id.
 * @param user - L'utilisateur
 */
export function requireBusinessId(user: AuthUser): string {
  if (!user.business_id) {
    throw new Error('User must have a business_id');
  }
  return user.business_id;
}
