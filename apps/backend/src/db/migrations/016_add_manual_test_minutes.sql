-- Feature 016: ajoute manual_test_minutes pour le calcul ROI du dashboard analytics
ALTER TABLE teams ADD COLUMN IF NOT EXISTS manual_test_minutes SMALLINT NOT NULL DEFAULT 30;
