#!/usr/bin/env python3
"""
Database migration management script for Breslev Torah Online.
"""
import asyncio
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from app.models import *  # noqa: F401, F403
from app.utils.logger import setup_logger
from sqlmodel import SQLModel
from sqlalchemy import text

logger = setup_logger(__name__)


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


async def drop_tables():
    """Drop all database tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
        logger.info("✅ Database tables dropped successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error dropping tables: {e}")
        return False


async def reset_database():
    """Reset the database by dropping and recreating all tables."""
    logger.info("🔄 Resetting database...")
    
    # Drop existing tables
    await drop_tables()
    
    # Create new tables
    await create_tables()
    
    logger.info("🎉 Database reset completed successfully!")


async def check_database():
    """Check database connection and table status."""
    try:
        async with engine.connect() as conn:
            # Test connection
            result = await conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            
            # Check if tables exist
            tables = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            
            table_names = [row[0] for row in tables.fetchall()]
            
            if table_names:
                logger.info(f"📊 Found {len(table_names)} tables: {', '.join(table_names)}")
            else:
                logger.info("📊 No tables found in database")
                
            return True
            
    except Exception as e:
        logger.error(f"❌ Database check failed: {e}")
        return False


def main():
    """Main CLI function."""
    if len(sys.argv) < 2:
        print("""
Usage: python manage_migrations.py <command>

Commands:
  create     - Create all database tables
  drop       - Drop all database tables
  reset      - Drop and recreate all tables
  check      - Check database connection and tables
        """)
        return
    
    command = sys.argv[1].lower()
    
    if command == "create":
        asyncio.run(create_tables())
    elif command == "drop":
        asyncio.run(drop_tables())
    elif command == "reset":
        asyncio.run(reset_database())
    elif command == "check":
        asyncio.run(check_database())
    else:
        print(f"❌ Unknown command: {command}")
        print("Available commands: create, drop, reset, check")


if __name__ == "__main__":
    main()