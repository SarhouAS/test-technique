import { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, requireRole, requireBusinessId } from '../../../lib/auth.js';
import { query } from '../../../lib/db.js';
import { Draw, Business, ApiResponse } from '../../../lib/types.js';

interface DrawDetail {
  draw: Draw;
  business: Business;
  participant_count: number;
  user_has_participated: boolean;
}

/**
 * GET /api/v1/draws/:id - Récupère les détails d'un tirage
 * PATCH /api/v1/draws/:id - Modifie un tirage
 * DELETE /api/v1/draws/:id - Supprime un tirage
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<any> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid draw ID' });
  }

  if (req.method === 'GET') {
    return handleGet(id, req, res);
  } else if (req.method === 'PATCH') {
    return handlePatch(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(id, req, res);
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(id: string, req: VercelRequest, res: VercelResponse): Promise<any> {
  try {
    // Récupérer le tirage
    const drawResult = await query('SELECT * FROM draws WHERE id = $1', [id]);

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draw not found' });
    }

    const draw = drawResult.rows[0];

    // Vérifier les permissions
    let user = null;
    let userHasParticipated = false;

    try {
      user = await authenticate(req);

      // Si l'utilisateur est authentifié, vérifier s'il a participé
      if (user.role === 'user') {
        const participationResult = await query(
          'SELECT * FROM draw_participants WHERE draw_id = $1 AND user_id = $2',
          [id, user.id]
        );
        userHasParticipated = participationResult.rows.length > 0;
      }
    } catch {
      // L'utilisateur n'est pas authentifié
      // On peut quand même afficher le tirage s'il est public (active)
      if (draw.status !== 'active') {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
    }

    // Récupérer le business
    const businessResult = await query('SELECT * FROM businesses WHERE id = $1', [draw.business_id]);
    const business = businessResult.rows[0];

    // Compter les participants
    const countResult = await query(
      'SELECT COUNT(*) as count FROM draw_participants WHERE draw_id = $1',
      [id]
    );
    const participant_count = parseInt(countResult.rows[0].count, 10);

    const response: ApiResponse<DrawDetail> = {
      success: true,
      data: {
        draw,
        business,
        participant_count,
        user_has_participated: userHasParticipated,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /api/v1/draws/:id:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

async function handlePatch(id: string, req: VercelRequest, res: VercelResponse): Promise<any> {
  try {
    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un restaurant
    requireRole(user, 'restaurant');

    // Récupérer le tirage
    const drawResult = await query('SELECT * FROM draws WHERE id = $1', [id]);

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draw not found' });
    }

    const draw = drawResult.rows[0];

    // Vérifier que le restaurant est propriétaire
    if (draw.business_id !== user.business_id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Vérifier qu'il n'y a pas de participants
    const countResult = await query(
      'SELECT COUNT(*) as count FROM draw_participants WHERE draw_id = $1',
      [id]
    );
    const participant_count = parseInt(countResult.rows[0].count, 10);

    if (participant_count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify a draw with participants',
      });
    }

    // Valider et mettre à jour les champs
    const {
      prize_name,
      prize_description,
      prize_image_url,
      draw_type,
      draw_date,
      trigger_threshold,
      win_probability,
      use_default_terms,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (prize_name !== undefined) {
      if (typeof prize_name !== 'string' || prize_name.length < 5 || prize_name.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'prize_name must be between 5 and 200 characters',
        });
      }
      updates.push(`prize_name = $${paramIndex}`);
      params.push(prize_name);
      paramIndex++;
    }

    if (prize_description !== undefined) {
      updates.push(`prize_description = $${paramIndex}`);
      params.push(prize_description || null);
      paramIndex++;
    }

    if (prize_image_url !== undefined) {
      updates.push(`prize_image_url = $${paramIndex}`);
      params.push(prize_image_url || null);
      paramIndex++;
    }

    if (draw_type !== undefined) {
      if (!['fixed_date', 'conditional'].includes(draw_type)) {
        return res.status(400).json({
          success: false,
          error: 'draw_type must be "fixed_date" or "conditional"',
        });
      }
      updates.push(`draw_type = $${paramIndex}`);
      params.push(draw_type);
      paramIndex++;
    }

    if (draw_date !== undefined) {
      const drawDateObj = new Date(draw_date);
      if (drawDateObj <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'draw_date must be in the future',
        });
      }
      updates.push(`draw_date = $${paramIndex}`);
      params.push(draw_date || null);
      paramIndex++;
    }

    if (trigger_threshold !== undefined) {
      if (trigger_threshold <= 0) {
        return res.status(400).json({
          success: false,
          error: 'trigger_threshold must be > 0',
        });
      }
      updates.push(`trigger_threshold = $${paramIndex}`);
      params.push(trigger_threshold || null);
      paramIndex++;
    }

    if (win_probability !== undefined) {
      updates.push(`win_probability = $${paramIndex}`);
      params.push(win_probability || null);
      paramIndex++;
    }

    if (use_default_terms !== undefined) {
      updates.push(`use_default_terms = $${paramIndex}`);
      params.push(use_default_terms);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);

    // Ajouter l'ID à la fin des paramètres
    params.push(id);

    const updateSql = `
      UPDATE draws
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateSql, params);
    const updatedDraw = result.rows[0];

    const response: ApiResponse<Draw> = {
      success: true,
      data: updatedDraw,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in PATCH /api/v1/draws/:id:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update draw',
    });
  }
}

async function handleDelete(id: string, req: VercelRequest, res: VercelResponse): Promise<any> {
  try {
    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un restaurant
    requireRole(user, 'restaurant');

    // Récupérer le tirage
    const drawResult = await query('SELECT * FROM draws WHERE id = $1', [id]);

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draw not found' });
    }

    const draw = drawResult.rows[0];

    // Vérifier que le restaurant est propriétaire
    if (draw.business_id !== user.business_id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Vérifier qu'il n'y a pas de participants
    const countResult = await query(
      'SELECT COUNT(*) as count FROM draw_participants WHERE draw_id = $1',
      [id]
    );
    const participant_count = parseInt(countResult.rows[0].count, 10);

    if (participant_count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a draw with participants',
      });
    }

    // Supprimer le tirage
    await query('DELETE FROM draws WHERE id = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in DELETE /api/v1/draws/:id:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete draw',
    });
  }
}