import axios, { AxiosInstance, AxiosError } from 'axios';

export interface Draw {
  id: string;
  prize_name: string;
  prize_description?: string;
  prize_image_url?: string;
  draw_type: 'fixed_date' | 'conditional';
  draw_date?: string;
  trigger_threshold?: number;
  win_probability?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  email?: string;
  city?: string;
}

// Interface pour la réponse complète de GET /draws/:id
export interface DrawDetailResponse {
  draw: Draw;
  business: Business;
  participant_count: number;
  user_has_participated: boolean;
}

export class MobileDrawsApiService {
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
   * Récupère les détails d'un tirage.
   */
  async getDrawDetail(drawId: string): Promise<DrawDetailResponse> {
    try {
      const response = await this.client.get(`/draws/${drawId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Enregistre la participation d'un utilisateur à un tirage.
   */
  async participate(drawId: string, acceptTerms: boolean): Promise<any> {
    try {
      const response = await this.client.post(`/draws/${drawId}/participate`, {
        accept_terms: acceptTerms,
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Gère les erreurs d'API.
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const message = (axiosError.response.data as any)?.error || 'API Error';
        const code = (axiosError.response.data as any)?.code;
        const err = new Error(message);
        (err as any).code = code;
        (err as any).status = axiosError.response.status;
        return err;
      } else if (axiosError.request) {
        return new Error('Network error');
      }
    }
    return new Error((error as Error)?.message || 'Unknown error');
  }
}

// Instance globale du service
let apiService: MobileDrawsApiService | null = null;

export function initializeMobileDrawsApi(baseURL: string): MobileDrawsApiService {
  apiService = new MobileDrawsApiService(baseURL);
  return apiService;
}

export function getMobileDrawsApi(): MobileDrawsApiService {
  if (!apiService) {
    // Dans un vrai projet Expo, l'initialisation se ferait au démarrage de l'application.
    // Pour ce test, nous allons simuler une initialisation si elle n'a pas eu lieu.
    // NOTE: Le baseURL devrait être récupéré via Expo constants ou .env
    console.warn("MobileDrawsApi not initialized. Using placeholder URL.");
    initializeMobileDrawsApi('http://localhost:3001/api/v1');
  }
  return apiService!;
}