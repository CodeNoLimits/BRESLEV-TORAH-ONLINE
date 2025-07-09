#!/usr/bin/env python3
"""
Production database migration script for Railway deployment.
"""
import asyncio
import sys
import os
from pathlib import Path
import json

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from app.models import *  # noqa: F401, F403
from app.utils.logger import setup_logger
from sqlmodel import SQLModel
from sqlalchemy import text

logger = setup_logger(__name__)

async def ensure_database_exists():
    """Ensure the database exists and is accessible."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

async def create_tables():
    """Create all database tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")
        return False

async def import_breslov_texts():
    """Import Breslov texts from JSON files."""
    try:
        from app.services.sefaria_smart_import import import_breslov_books
        
        # Check if data directory exists
        data_dir = Path("./data/breslov_texts")
        if not data_dir.exists():
            logger.warning("📂 Breslov texts directory not found, skipping import")
            return True
            
        # Get list of JSON files
        json_files = list(data_dir.glob("*.json"))
        if not json_files:
            logger.warning("📂 No Breslov text files found, skipping import")
            return True
            
        logger.info(f"📚 Found {len(json_files)} Breslov text files")
        
        # Import each file
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                    
                book_name = json_file.stem
                logger.info(f"📖 Importing {book_name}...")
                
                # Import using the smart import service
                await import_breslov_books([book_data])
                
            except Exception as e:
                logger.error(f"❌ Error importing {json_file}: {e}")
                continue
                
        logger.info("✅ Breslov texts imported successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error importing Breslov texts: {e}")
        return False

async def create_sample_user():
    """Create a sample admin user for testing."""
    try:
        from app.services.auth import create_user
        from app.models.user import UserCreate
        
        # Check if user already exists
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id FROM users WHERE email = 'admin@breslevtorah.com'
            """))
            
            if result.fetchone():
                logger.info("👤 Admin user already exists")
                return True
        
        # Create admin user
        user_data = UserCreate(
            email="admin@breslevtorah.com",
            password="admin123",
            full_name="Admin User",
            is_active=True
        )
        
        user = await create_user(user_data)
        logger.info(f"✅ Admin user created: {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {e}")
        return False

async def run_production_migration():
    """Run the complete production migration."""
    logger.info("🚀 Starting production database migration...")
    
    # Step 1: Ensure database connection
    if not await ensure_database_exists():
        logger.error("❌ Cannot connect to database")
        return False
    
    # Step 2: Create tables
    if not await create_tables():
        logger.error("❌ Failed to create tables")
        return False
    
    # Step 3: Import Breslov texts
    if not await import_breslov_texts():
        logger.warning("⚠️ Failed to import Breslov texts (continuing anyway)")
    
    # Step 4: Create sample user
    if not await create_sample_user():
        logger.warning("⚠️ Failed to create sample user (continuing anyway)")
    
    logger.info("🎉 Production migration completed successfully!")
    return True

async def check_migration_status():
    """Check the status of the migration."""
    try:
        async with engine.connect() as conn:
            # Check tables
            tables = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            
            table_names = [row[0] for row in tables.fetchall()]
            logger.info(f"📊 Database tables: {', '.join(table_names)}")
            
            # Check if we have books
            if 'books' in table_names:
                books = await conn.execute(text("SELECT COUNT(*) FROM books"))
                book_count = books.fetchone()[0]
                logger.info(f"📚 Books in database: {book_count}")
            
            # Check if we have users
            if 'users' in table_names:
                users = await conn.execute(text("SELECT COUNT(*) FROM users"))
                user_count = users.fetchone()[0]
                logger.info(f"👥 Users in database: {user_count}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Migration status check failed: {e}")
        return False

def main():
    """Main CLI function."""
    if len(sys.argv) < 2:
        print("""
Usage: python deploy_migration.py <command>

Commands:
  migrate    - Run complete production migration
  status     - Check migration status
  tables     - Create tables only
        """)
        return
    
    command = sys.argv[1].lower()
    
    if command == "migrate":
        success = asyncio.run(run_production_migration())
        sys.exit(0 if success else 1)
    elif command == "status":
        asyncio.run(check_migration_status())
    elif command == "tables":
        asyncio.run(create_tables())
    else:
        print(f"❌ Unknown command: {command}")
        print("Available commands: migrate, status, tables")

if __name__ == "__main__":
    main()