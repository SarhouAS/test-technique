import { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, requireRole, requireBusinessId } from '../../../../lib/auth.js';
import { query } from '../../../../lib/db.js';
import { ApiResponse } from '../../../../lib/types.js';

interface Participant {
  id: string;
  user_name: string;
  user_email: string;
  participated_at: string;
}

interface ParticipantsResponse {
  participants: Participant[];
  total: number;
}

/**
 * GET /api/v1/draws/:id/participants
 * Récupère la liste des participants d'un tirage.
 * 
 * Query params:
 * - limit: nombre de participants à retourner (défaut 50, max 100)
 * - offset: décalage pour la pagination (défaut 0)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<any> {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid draw ID' });
    }

    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un restaurant
    requireRole(user, 'restaurant');

    // Récupérer le business_id
    const businessId = requireBusinessId(user);

    // Récupérer le tirage
    const drawResult = await query('SELECT * FROM draws WHERE id = $1', [id]);

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draw not found' });
    }

    const draw = drawResult.rows[0];

    // Vérifier que le restaurant est propriétaire
    if (draw.business_id !== businessId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Récupérer les paramètres de pagination
    let limit = 50;
    let offset = 0;

    if (req.query.limit) {
      limit = Math.min(parseInt(req.query.limit as string, 10), 100);
      if (isNaN(limit) || limit <= 0) {
        limit = 50;
      }
    }

    if (req.query.offset) {
      offset = Math.max(parseInt(req.query.offset as string, 10), 0);
      if (isNaN(offset)) {
        offset = 0;
      }
    }

    // Récupérer le nombre total de participants
    const countResult = await query(
      'SELECT COUNT(*) as total FROM draw_participants WHERE draw_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Récupérer les participants
    const participantsResult = await query(
      `
      SELECT 
        dp.id,
        u.name as user_name,
        u.email as user_email,
        dp.participated_at
      FROM draw_participants dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.draw_id = $1
      ORDER BY dp.participated_at DESC
      LIMIT $2
      OFFSET $3
      `,
      [id, limit, offset]
    );

    const participants = participantsResult.rows.map((row: any) => ({
      id: row.id,
      user_name: row.user_name,
      user_email: row.user_email,
      participated_at: row.participated_at,
    }));

    const response: ApiResponse<ParticipantsResponse> = {
      success: true,
      data: {
        participants,
        total,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /api/v1/draws/:id/participants:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participants',
    });
  }
}
