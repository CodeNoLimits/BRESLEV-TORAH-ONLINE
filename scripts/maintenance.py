#!/usr/bin/env python3
"""
Automated maintenance tasks for Breslev Torah Online.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import json
import aiohttp
from typing import Dict, Any, List

sys.path.append(str(Path(__file__).parent.parent))

from backend.app.core.config import settings
from backend.app.database import get_async_session
from backend.app.services.cache_service import cache_service
from backend.app.utils.logger import logger


class MaintenanceManager:
    """
    Manages routine maintenance tasks.
    """
    
    def __init__(self):
        self.tasks = []
        self.metrics = {
            "last_run": None,
            "tasks_completed": 0,
            "tasks_failed": 0,
            "duration_seconds": 0,
        }
    
    async def run_daily_maintenance(self):
        """Run daily maintenance tasks."""
        logger.info("Starting daily maintenance...")
        start_time = datetime.now()
        
        tasks = [
            self.cleanup_old_sessions(),
            self.optimize_database(),
            self.rotate_logs(),
            self.update_search_index(),
            self.cleanup_temp_files(),
            self.check_ssl_certificates(),
            self.generate_sitemap(),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Task failed: {tasks[i].__name__} - {result}")
                self.metrics["tasks_failed"] += 1
            else:
                self.metrics["tasks_completed"] += 1
        
        self.metrics["last_run"] = datetime.now().isoformat()
        self.metrics["duration_seconds"] = (datetime.now() - start_time).total_seconds()
        
        # Save metrics
        await cache_service.set("maintenance:metrics", self.metrics, ttl=86400)
        
        logger.info(f"Daily maintenance completed in {self.metrics['duration_seconds']:.2f}s")
    
    async def cleanup_old_sessions(self):
        """Clean up expired sessions and temporary data."""
        logger.info("Cleaning up old sessions...")
        
        async with get_async_session() as db:
            # Delete expired chat sessions
            from sqlmodel import delete
            from backend.app.models.chat import Chat
            
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            stmt = delete(Chat).where(Chat.created_at < cutoff_date)
            result = await db.execute(stmt)
            await db.commit()
            
            logger.info(f"Deleted {result.rowcount} old chat sessions")
        
        # Clean Redis sessions
        pattern = "session:*"
        deleted = 0
        
        # Simplified cleanup for Redis
        try:
            await cache_service.clear_pattern(pattern)
            deleted = 1
        except Exception as e:
            logger.error(f"Failed to cleanup Redis sessions: {e}")
        
        logger.info(f"Cleaned up Redis sessions: {deleted}")
    
    async def optimize_database(self):
        """Run database optimization tasks."""
        logger.info("Optimizing database...")
        
        async with get_async_session() as db:
            try:
                # Update statistics
                await db.execute("ANALYZE;")
                
                # Reindex if needed
                tables = ["texts", "books", "users", "chat_messages"]
                for table in tables:
                    try:
                        await db.execute(f"REINDEX TABLE {table};")
                    except Exception as e:
                        logger.warning(f"Failed to reindex {table}: {e}")
                
                # Vacuum (only in maintenance window)
                if datetime.now().hour == 3:  # 3 AM
                    await db.execute("VACUUM ANALYZE;")
                
                await db.commit()
            except Exception as e:
                logger.error(f"Database optimization failed: {e}")
        
        logger.info("Database optimization completed")
    
    async def rotate_logs(self):
        """Rotate and compress old logs."""
        logger.info("Rotating logs...")
        
        log_dir = Path("./logs")
        if not log_dir.exists():
            logger.info("No logs directory found, skipping rotation")
            return
        
        # Find logs older than 7 days
        cutoff_date = datetime.now() - timedelta(days=7)
        rotated = 0
        
        for log_file in log_dir.glob("*.log"):
            if log_file.stat().st_mtime < cutoff_date.timestamp():
                try:
                    # Compress log
                    compressed_name = f"{log_file}.{datetime.now().strftime('%Y%m%d')}.gz"
                    
                    import gzip
                    with open(log_file, 'rb') as f_in:
                        with gzip.open(log_dir / compressed_name, 'wb') as f_out:
                            f_out.writelines(f_in)
                    
                    # Remove original
                    log_file.unlink()
                    rotated += 1
                except Exception as e:
                    logger.error(f"Failed to rotate {log_file}: {e}")
        
        logger.info(f"Rotated {rotated} log files")
    
    async def update_search_index(self):
        """Update search indices for better performance."""
        logger.info("Updating search indices...")
        
        try:
            async with get_async_session() as db:
                from sqlmodel import select
                from backend.app.models.text import Text
                
                cutoff_date = datetime.utcnow() - timedelta(days=1)
                stmt = select(Text).where(Text.updated_at > cutoff_date)
                result = await db.execute(stmt)
                texts = result.scalars().all()
                
                # In a real implementation, this would update vector embeddings
                # For now, just log the count
                logger.info(f"Found {len(texts)} texts to reindex")
                
        except Exception as e:
            logger.error(f"Search index update failed: {e}")
    
    async def cleanup_temp_files(self):
        """Clean up temporary files and caches."""
        logger.info("Cleaning up temporary files...")
        
        # Clean audio cache
        audio_dir = Path("./cache/audio")
        if audio_dir.exists():
            cutoff_date = datetime.now() - timedelta(days=30)
            cleaned = 0
            
            for audio_file in audio_dir.glob("*.mp3"):
                if audio_file.stat().st_mtime < cutoff_date.timestamp():
                    try:
                        audio_file.unlink()
                        cleaned += 1
                    except Exception as e:
                        logger.error(f"Failed to clean {audio_file}: {e}")
            
            logger.info(f"Cleaned {cleaned} old audio files")
        
        # Clean upload directory
        upload_dir = Path("./uploads")
        if upload_dir.exists():
            for temp_file in upload_dir.glob("tmp_*"):
                if temp_file.stat().st_mtime < (datetime.now() - timedelta(hours=24)).timestamp():
                    try:
                        temp_file.unlink()
                    except Exception as e:
                        logger.error(f"Failed to clean {temp_file}: {e}")
    
    async def check_ssl_certificates(self):
        """Check SSL certificate expiration."""
        logger.info("Checking SSL certificates...")
        
        domains = [
            "breslev-torah.com",
            "api.breslev-torah.com",
        ]
        
        for domain in domains:
            try:
                # Check certificate expiration
                import ssl
                import socket
                
                context = ssl.create_default_context()
                with socket.create_connection((domain, 443), timeout=10) as sock:
                    with context.wrap_socket(sock, server_hostname=domain) as ssock:
                        cert = ssock.getpeercert()
                        
                        # Parse expiration date
                        not_after = datetime.strptime(
                            cert['notAfter'],
                            '%b %d %H:%M:%S %Y %Z'
                        )
                        
                        days_until_expiry = (not_after - datetime.now()).days
                        
                        if days_until_expiry < 30:
                            logger.warning(
                                f"SSL certificate for {domain} expires in {days_until_expiry} days"
                            )
                            
                            # Send alert
                            await self.send_alert(
                                f"SSL Certificate Expiring Soon",
                                f"Certificate for {domain} expires in {days_until_expiry} days"
                            )
                        else:
                            logger.info(f"SSL certificate for {domain} valid for {days_until_expiry} days")
                            
            except Exception as e:
                logger.error(f"Failed to check SSL for {domain}: {e}")
    
    async def generate_sitemap(self):
        """Generate sitemap for SEO."""
        logger.info("Generating sitemap...")
        
        sitemap_entries = [
            {"loc": "/", "priority": "1.0", "changefreq": "daily"},
            {"loc": "/books", "priority": "0.9", "changefreq": "weekly"},
            {"loc": "/chat", "priority": "0.8", "changefreq": "monthly"},
            {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        ]
        
        # Add book pages
        try:
            async with get_async_session() as db:
                from sqlmodel import select
                from backend.app.models.book import Book
                
                stmt = select(Book).where(Book.is_public == True)
                result = await db.execute(stmt)
                books = result.scalars().all()
                
                for book in books:
                    sitemap_entries.append({
                        "loc": f"/books/{book.slug}",
                        "priority": "0.8",
                        "changefreq": "weekly",
                    })
        except Exception as e:
            logger.error(f"Failed to fetch books for sitemap: {e}")
        
        # Generate XML
        sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        
        for entry in sitemap_entries:
            sitemap_xml += f"""  <url>
    <loc>https://breslev-torah.com{entry['loc']}</loc>
    <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>{entry['changefreq']}</changefreq>
    <priority>{entry['priority']}</priority>
  </url>\n"""
        
        sitemap_xml += '</urlset>'
        
        # Save sitemap
        try:
            sitemap_path = Path("./frontend/public/sitemap.xml")
            sitemap_path.parent.mkdir(parents=True, exist_ok=True)
            sitemap_path.write_text(sitemap_xml)
            
            logger.info(f"Generated sitemap with {len(sitemap_entries)} entries")
        except Exception as e:
            logger.error(f"Failed to write sitemap: {e}")
    
    async def send_alert(self, subject: str, message: str):
        """Send maintenance alert."""
        webhook_url = os.getenv("ALERT_WEBHOOK_URL")
        if not webhook_url:
            logger.info(f"No webhook configured for alert: {subject}")
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "text": f"🚨 *{subject}*\n{message}",
                    "username": "Breslev Torah Maintenance",
                }
                
                await session.post(webhook_url, json=payload)
                logger.info(f"Alert sent: {subject}")
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")


async def main():
    """Run maintenance tasks."""
    manager = MaintenanceManager()
    
    # Check if specific task requested
    if len(sys.argv) > 1:
        task_name = sys.argv[1]
        if hasattr(manager, task_name):
            logger.info(f"Running specific task: {task_name}")
            await getattr(manager, task_name)()
        else:
            logger.error(f"Unknown task: {task_name}")
            sys.exit(1)
    else:
        # Run all daily maintenance
        await manager.run_daily_maintenance()


if __name__ == "__main__":
    asyncio.run(main())