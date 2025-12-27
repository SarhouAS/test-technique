import { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, requireRole, requireBusinessId } from '../../../lib/auth.js';
import { query } from '../../../lib/db.js';
import { Draw, ApiResponse } from '../../../lib/types.js';

/**
 * GET /api/v1/draws
 * Récupère la liste des tirages du restaurant authentifié.
 * 
 * Query params:
 * - status: 'active' | 'completed' | 'cancelled' (optionnel)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Vérifier la méthode HTTP
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un restaurant
    requireRole(user, 'restaurant');

    // Récupérer le business_id
    const businessId = requireBusinessId(user);

    // Récupérer les paramètres de query
    const status = req.query.status as string | undefined;

    // Construire la requête SQL
    let sql = `
      SELECT 
        d.*,
        COUNT(dp.id) as participant_count
      FROM draws d
      LEFT JOIN draw_participants dp ON d.id = dp.draw_id
      WHERE d.business_id = $1
    `;

    const params: unknown[] = [businessId];

    if (status) {
      sql += ` AND d.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += `
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    // Exécuter la requête
    const result = await query(sql, params);

    // Formater la réponse
    const draws = result.rows.map((row: any) => ({
      id: row.id,
      prize_name: row.prize_name,
      status: row.status,
      participant_count: parseInt(row.participant_count, 10),
      draw_date: row.draw_date,
      created_at: row.created_at,
    }));

    const response: ApiResponse<Draw[]> = {
      success: true,
      data: draws,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /api/v1/draws:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Authentifier l'utilisateur
    const user = await authenticate(req);

    // Vérifier que c'est un restaurant
    requireRole(user, 'restaurant');

    // Récupérer le business_id
    const businessId = requireBusinessId(user);

    // Valider le body
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

    // Validations
    if (!prize_name || typeof prize_name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'prize_name is required and must be a string',
      });
    }

    if (prize_name.length < 5 || prize_name.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'prize_name must be between 5 and 200 characters',
      });
    }

    if (!draw_type || !['fixed_date', 'conditional'].includes(draw_type)) {
      return res.status(400).json({
        success: false,
        error: 'draw_type must be "fixed_date" or "conditional"',
      });
    }

    if (draw_type === 'fixed_date') {
      if (!draw_date) {
        return res.status(400).json({
          success: false,
          error: 'draw_date is required for fixed_date draws',
        });
      }

      const drawDateObj = new Date(draw_date);
      if (drawDateObj <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'draw_date must be in the future',
        });
      }
    }

    if (draw_type === 'conditional') {
      if (!trigger_threshold || trigger_threshold <= 0) {
        return res.status(400).json({
          success: false,
          error: 'trigger_threshold is required and must be > 0 for conditional draws',
        });
      }
    }

    // Créer le tirage
    const insertSql = `
      INSERT INTO draws (
        business_id,
        prize_name,
        prize_description,
        prize_image_url,
        draw_type,
        draw_date,
        trigger_threshold,
        win_probability,
        use_default_terms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await query(insertSql, [
      businessId,
      prize_name,
      prize_description || null,
      prize_image_url || null,
      draw_type,
      draw_date || null,
      trigger_threshold || null,
      win_probability || null,
      use_default_terms !== false,
    ]);

    const draw = result.rows[0];

    const response: ApiResponse<Draw> = {
      success: true,
      data: draw,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /api/v1/draws:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draw',
    });
  }
}
