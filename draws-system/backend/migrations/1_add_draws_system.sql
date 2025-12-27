-- 1_add_draws_system.sql

-- ====================================================================================
-- Tables de base (users et businesses) - Requises pour le test
-- ====================================================================================

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

-- ====================================================================================
-- Table des tirages au sort (draws)
-- ====================================================================================

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

-- Index obligatoires
CREATE INDEX idx_draws_business_id ON draws (business_id);
CREATE INDEX idx_draws_status ON draws (status);
CREATE INDEX idx_draws_draw_date ON draws (draw_date) WHERE draw_type = 'fixed_date';


-- ====================================================================================
-- Table des participants (draw_participants)
-- ====================================================================================

CREATE TABLE draw_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (draw_id, user_id) -- CRITIQUE pour empêcher participations multiples
);
COMMENT ON TABLE draw_participants IS 'Table des participations aux tirages.';
COMMENT ON COLUMN draw_participants.draw_id IS 'ID du tirage (FK vers draws).';
COMMENT ON COLUMN draw_participants.user_id IS 'ID de l''utilisateur participant (FK vers users).';

-- Index obligatoires
CREATE INDEX idx_draw_participants_draw ON draw_participants (draw_id);
CREATE INDEX idx_draw_participants_user ON draw_participants (user_id);
