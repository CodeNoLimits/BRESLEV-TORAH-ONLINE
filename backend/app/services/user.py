"""
User service for managing user operations.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.user import User
from app.utils.logger import logger


class UserService:
    """
    Service for user operations.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object or None if not found
        """
        try:
            result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            email: User email
            
        Returns:
            User object or None if not found
        """
        try:
            result = await self.db.execute(
                select(User).where(User.email == email)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def create_user(self, user: User) -> User:
        """
        Create a new user.
        
        Args:
            user: User object to create
            
        Returns:
            Created user object
        """
        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User created: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating user {user.email}: {e}")
            raise e
    
    async def update_user(self, user_id: int, **kwargs) -> Optional[User]:
        """
        Update user fields.
        
        Args:
            user_id: User ID
            **kwargs: Fields to update
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            for field, value in kwargs.items():
                if hasattr(user, field):
                    setattr(user, field, value)
            
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User updated: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating user {user_id}: {e}")
            raise e
    
    async def update_password(self, user_id: int, new_password_hash: str) -> Optional[User]:
        """
        Update user password.
        
        Args:
            user_id: User ID
            new_password_hash: New password hash
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            user.hashed_password = new_password_hash
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"Password updated for user: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating password for user {user_id}: {e}")
            raise e
    
    async def verify_user(self, user_id: int) -> Optional[User]:
        """
        Mark user as verified.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            user.is_verified = True
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User verified: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error verifying user {user_id}: {e}")
            raise e
    
    async def deactivate_user(self, user_id: int) -> Optional[User]:
        """
        Deactivate user account.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            user.is_active = False
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User deactivated: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deactivating user {user_id}: {e}")
            raise e
    
    async def update_last_login(self, user_id: int) -> Optional[User]:
        """
        Update user's last login timestamp.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            user.last_login = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating last login for user {user_id}: {e}")
            raise e
    
    async def update_preferences(self, user_id: int, preferences: dict) -> Optional[User]:
        """
        Update user preferences.
        
        Args:
            user_id: User ID
            preferences: User preferences dictionary
            
        Returns:
            Updated user object or None if not found
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            # Update individual preference fields
            if 'preferred_language' in preferences:
                user.preferred_language = preferences['preferred_language']
            
            user.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"Preferences updated for user: {user.email}")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating preferences for user {user_id}: {e}")
            raise e
    
    async def delete_user(self, user_id: int) -> bool:
        """
        Delete user account (soft delete by deactivating).
        
        Args:
            user_id: User ID
            
        Returns:
            True if user was deleted successfully
        """
        try:
            # For now, we'll just deactivate instead of hard delete
            user = await self.deactivate_user(user_id)
            return user is not None
            
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            return False