-- Initialisation de la base de données Breslev Torah Online
-- Ce script est exécuté automatiquement lors du premier démarrage de PostgreSQL

-- Créer l'extension pour UUID si pas déjà présente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer l'extension pour les recherches full-text hébraïques
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Configuration pour l'hébreu et le français
-- Note: Les configurations spécifiques seront ajoutées par SQLModel/Alembic

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données Breslev Torah Online initialisée avec succès!';
    RAISE NOTICE 'Extensions installées: uuid-ossp, unaccent';
    RAISE NOTICE 'Prêt pour les migrations Alembic';
END
$$;