-- Optional development seed.
-- Run AFTER `alembic upgrade head`.
--   psql "$DATABASE_URL" -f database/seed/seed.sql

-- Demo user: demo@cineverse.local / demopassword1
-- bcrypt hash generated with rounds=12.
INSERT INTO users (email, hashed_password, full_name, is_active, role)
VALUES (
    'demo@cineverse.local',
    '$2b$12$KIXQ.YbXgZ3.qP6Wd2g3JOYqJ8b7rj9hO1ZQ9o7d9Z6P1xV6Z8Y5G',
    'Demo User',
    true,
    'user'
)
ON CONFLICT (email) DO NOTHING;
