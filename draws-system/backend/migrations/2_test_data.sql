-- 2_test_data.sql

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
