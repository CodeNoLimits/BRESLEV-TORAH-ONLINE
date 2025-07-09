# Database Migrations for Breslev Torah Online

This directory contains Alembic database migrations for the Breslev Torah Online application.

## Setup

1. Make sure you have PostgreSQL running
2. Create the database:
   ```bash
   createdb breslev_db
   ```

3. Set up your environment variables in `.env.development`:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/breslev_db
   ```

## Migration Commands

### Using the custom migration script:
```bash
# Create all tables
python manage_migrations.py create

# Check database status
python manage_migrations.py check

# Reset database (drop and recreate)
python manage_migrations.py reset

# Drop all tables
python manage_migrations.py drop
```

### Using Alembic directly:
```bash
# Create a new migration
python run_alembic.py revision --autogenerate -m "Description of changes"

# Apply migrations
python run_alembic.py upgrade head

# Rollback migrations
python run_alembic.py downgrade -1

# Check current migration status
python run_alembic.py current

# Show migration history
python run_alembic.py history
```

## Database Schema

The database contains the following tables:

### Users
- `users` - User accounts with authentication info
- Stores user profile, preferences, and authentication data

### Content
- `books` - Breslov book metadata
- `texts` - Individual text segments with translations
- `bookmarks` - User bookmarks and notes
- `studyprogresses` - User reading progress tracking

### Chat
- `chats` - Chat sessions with AI assistant
- `chatmessages` - Individual messages in chat sessions

## Migration Files

- `20250709_064852_initial_migration.py` - Initial database schema creation

## Configuration

The Alembic configuration is in:
- `alembic.ini` - Main configuration
- `env.py` - Environment setup and model imports

## Notes

- All models are defined using SQLModel
- Database uses PostgreSQL with async support
- Migrations support both online and offline mode
- Foreign key constraints are properly configured