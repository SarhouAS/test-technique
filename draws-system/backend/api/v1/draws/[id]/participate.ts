import { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, requireRole } from '../../../../lib/auth.js';
import { query } from '../../../../lib/db.js';
import { DrawParticipant, ApiResponse } from '../../../../lib/types.js';

/**
 * POST /api/v1/draws/:id/participate
 * Enregistre la participation d'un utilisateur à un tirage.
 * 
 * Body:
 * {
 *   "accept_terms": true
 * }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<any> {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid draw ID' });
    }

    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un utilisateur (pas restaurant/admin)
    requireRole(user, 'user');

    // Valider le body
    const { accept_terms } = req.body;

    if (!accept_terms) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the terms to participate',
      });
    }

    // Récupérer le tirage
    const drawResult = await query('SELECT * FROM draws WHERE id = $1', [id]);

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draw not found' });
    }

    const draw = drawResult.rows[0];

    // Vérifier que le tirage est actif
    if (draw.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This draw is not available',
        code: 'DRAW_NOT_AVAILABLE',
      });
    }

    // Vérifier que l'utilisateur n'a pas déjà participé
    const existingResult = await query(
      'SELECT * FROM draw_participants WHERE draw_id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Vous participez déjà à ce tirage',
        code: 'ALREADY_PARTICIPATED',
      });
    }

    // Créer la participation
    const insertSql = `
      INSERT INTO draw_participants (draw_id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await query(insertSql, [id, user.id]);
    const participation = result.rows[0];

    const response: ApiResponse<DrawParticipant> = {
      success: true,
      data: participation,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /api/v1/draws/:id/participate:', error);

    // Vérifier si c'est une erreur de contrainte UNIQUE
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('unique constraint')) {
      return res.status(409).json({
        success: false,
        error: 'Vous participez déjà à ce tirage',
        code: 'ALREADY_PARTICIPATED',
      });
    }

    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}