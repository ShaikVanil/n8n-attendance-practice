-- Create the attendance_user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'attendance_user') THEN
        CREATE USER attendance_user WITH PASSWORD 'SecureProd2024!AttendanceDB#';
    END IF;
END
$$;

-- Grant necessary privileges
ALTER USER attendance_user CREATEDB;

DO $$
DECLARE
    db TEXT := current_database();
BEGIN
    IF db IS NOT NULL THEN
        -- Grant privileges and set owner for the active database (POSTGRES_DB)
        EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO attendance_user', db);
        EXECUTE format('ALTER DATABASE %I OWNER TO attendance_user', db);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'attendance_dev') THEN
        GRANT ALL PRIVILEGES ON DATABASE attendance_dev TO attendance_user;
        ALTER DATABASE attendance_dev OWNER TO attendance_user;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'attendance_prod') THEN
        GRANT ALL PRIVILEGES ON DATABASE attendance_prod TO attendance_user;
        ALTER DATABASE attendance_prod OWNER TO attendance_user;
    END IF;
END
$$;

-- Set ownership of the database
-- Removed hardcoded prod-only alter:
-- ALTER DATABASE attendance_prod OWNER TO attendance_user;

-- Grant schema privileges (these will be applied after schema creation)
GRANT ALL ON SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO attendance_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO attendance_user;