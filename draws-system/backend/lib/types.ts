/**
 * Types partagés pour l'API
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface Draw {
  id: string;
  business_id: string;
  prize_name: string;
  prize_description?: string;
  prize_image_url?: string;
  draw_type: 'fixed_date' | 'conditional';
  draw_date?: string;
  trigger_threshold?: number;
  win_probability?: string;
  terms_url?: string;
  use_default_terms: boolean;
  custom_terms?: string;
  status: 'active' | 'completed' | 'cancelled';
  winner_user_id?: string;
  drawn_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DrawParticipant {
  id: string;
  draw_id: string;
  user_id: string;
  participated_at: string;
}

export interface DrawWithStats extends Draw {
  participant_count: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'restaurant' | 'admin';
  business_id?: string;
  is_active: boolean;
}

export interface Business {
  id: string;
  name: string;
  email?: string;
  city?: string;
}
