import axios, { AxiosInstance } from 'axios';

interface Draw {
  id: string;
  prize_name: string;
  status: 'active' | 'completed' | 'cancelled';
  participant_count: number;
  draw_date?: string;
  created_at: string;
}

interface DrawDetail {
  id: string;
  business_id: string;
  prize_name: string;
  prize_description?: string;
  prize_image_url?: string;
  draw_type: 'fixed_date' | 'conditional';
  draw_date?: string;
  trigger_threshold?: number;
  win_probability?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  user_name: string;
  user_email: string;
  participated_at: string;
}

export class DrawsApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });

    // Intercepteur pour ajouter le token d'authentification
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  /**
   * Définit le token d'authentification.
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Récupère la liste des tirages du restaurant.
   */
  async getDraws(status?: string): Promise<Draw[]> {
    try {
      const response = await this.client.get('/draws', {
        params: status ? { status } : {},
      });
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Récupère les détails d'un tirage.
   */
  async getDrawDetail(drawId: string): Promise<DrawDetail> {
    try {
      const response = await this.client.get(`/draws/${drawId}`);
      return response.data.data.draw;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Crée un nouveau tirage.
   */
  async createDraw(data: {
    prize_name: string;
    prize_description?: string;
    prize_image_url?: string;
    draw_type: 'fixed_date' | 'conditional';
    draw_date?: string;
    trigger_threshold?: number;
    win_probability?: string;
    use_default_terms?: boolean;
  }): Promise<DrawDetail> {
    try {
      const response = await this.client.post('/draws', data);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Modifie un tirage existant.
   */
  async updateDraw(
    drawId: string,
    data: Partial<{
      prize_name: string;
      prize_description?: string;
      prize_image_url?: string;
      draw_type: 'fixed_date' | 'conditional';
      draw_date?: string;
      trigger_threshold?: number;
      win_probability?: string;
      use_default_terms?: boolean;
    }>
  ): Promise<DrawDetail> {
    try {
      const response = await this.client.patch(`/draws/${drawId}`, data);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Supprime un tirage.
   */
  async deleteDraw(drawId: string): Promise<void> {
    try {
      await this.client.delete(`/draws/${drawId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Récupère la liste des participants d'un tirage.
   */
  async getParticipants(
    drawId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ participants: Participant[]; total: number }> {
    try {
      const response = await this.client.get(`/draws/${drawId}/participants`, {
        params: { limit, offset },
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Gère les erreurs d'API.
   */
  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.error || 'API Error';
      return new Error(message);
    } else if (error.request) {
      return new Error('Network error');
    } else {
      return new Error(error.message || 'Unknown error');
    }
  }
}

// Instance globale du service
let apiService: DrawsApiService | null = null;

export function initializeDrawsApi(baseURL: string): DrawsApiService {
  apiService = new DrawsApiService(baseURL);
  return apiService;
}

export function getDrawsApi(): DrawsApiService {
  if (!apiService) {
    throw new Error('DrawsApi not initialized. Call initializeDrawsApi first.');
  }
  return apiService;
}
