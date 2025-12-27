# INTEGRATION.md - Instructions d'Intégration

Ce document détaille les étapes exactes pour intégrer les composants du système de tirages au sort.

## 1. Base de Données (PostgreSQL / Supabase)

Les schémas de tables et les données de test doivent être appliqués à votre base de données PostgreSQL (via Supabase).

### 1.1. Création des Schémas

Exécutez le contenu du fichier `backend/migrations/1_add_draws_system.sql` :

\`\`\`sql
-- Contenu de backend/migrations/1_add_draws_system.sql

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  city VARCHAR
);
COMMENT ON TABLE businesses IS 'Table des entreprises/restaurants.';

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('user', 'restaurant', 'admin')),
  business_id UUID,
  is_active BOOLEAN DEFAULT true
);
COMMENT ON TABLE users IS 'Table des utilisateurs avec rôles.';

CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prize_name VARCHAR(200) NOT NULL,
  prize_description TEXT,
  prize_image_url TEXT,
  draw_type VARCHAR(20) NOT NULL CHECK (draw_type IN ('fixed_date', 'conditional')),
  draw_date TIMESTAMP WITH TIME ZONE,
  trigger_threshold INTEGER,
  win_probability VARCHAR(50),
  terms_url TEXT,
  use_default_terms BOOLEAN DEFAULT true,
  custom_terms TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  drawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE draws IS 'Table principale des tirages au sort.';
COMMENT ON COLUMN draws.business_id IS 'ID du restaurant organisateur (FK vers businesses).';
COMMENT ON COLUMN draws.winner_user_id IS 'ID de l''utilisateur gagnant (FK vers users).';

CREATE INDEX idx_draws_business_id ON draws (business_id);
CREATE INDEX idx_draws_status ON draws (status);
CREATE INDEX idx_draws_draw_date ON draws (draw_date) WHERE draw_type = 'fixed_date';

CREATE TABLE draw_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (draw_id, user_id)
);
COMMENT ON TABLE draw_participants IS 'Table des participations aux tirages.';
COMMENT ON COLUMN draw_participants.draw_id IS 'ID du tirage (FK vers draws).';
COMMENT ON COLUMN draw_participants.user_id IS 'ID de l''utilisateur participant (FK vers users).';

CREATE INDEX idx_draw_participants_draw ON draw_participants (draw_id);
CREATE INDEX idx_draw_participants_user ON draw_participants (user_id);
\`\`\`

### 1.2. Données de Test

Exécutez le contenu du fichier `backend/migrations/2_test_data.sql` pour créer un restaurant et deux utilisateurs (un restaurateur et un client) :

\`\`\`sql
-- Contenu de backend/migrations/2_test_data.sql

-- Création d'un business de test
INSERT INTO businesses (id, name, email, city) VALUES
('b1234567-1234-5678-1234-567812345678', 'Le Restaurant du Coin', 'contact@restaurant.com', 'Paris')
ON CONFLICT (id) DO NOTHING;

-- Création d'un utilisateur "restaurant"
INSERT INTO users (id, email, name, role, business_id) VALUES
('r1234567-1234-5678-1234-567812345678', 'resto@example.com', 'Chef Restaurant', 'restaurant', 'b1234567-1234-5678-1234-567812345678')
ON CONFLICT (id) DO NOTHING;

-- Création d'un utilisateur "client"
INSERT INTO users (id, email, name, role) VALUES
('u1234567-1234-5678-1234-567812345678', 'client@example.com', 'Client Test', 'user')
ON CONFLICT (id) DO NOTHING;
\`\`\`