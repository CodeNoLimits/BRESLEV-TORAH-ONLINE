"""
Dependency injection utilities for FastAPI.
"""
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.services.user import UserService

# Security scheme
security = HTTPBearer()


async def get_database() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session.
    
    Yields:
        Database session
    """
    async for session in get_db():
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_database)
) -> User:
    """
    Get current authenticated user.
    
    Args:
        credentials: HTTP authorization credentials
        db: Database session
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user_service = UserService(db)
    user = await user_service.get_user_by_id(int(user_id))
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user.
    
    Args:
        current_user: Current user
        
    Returns:
        Current active user
        
    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current verified user.
    
    Args:
        current_user: Current active user
        
    Returns:
        Current verified user
        
    Raises:
        HTTPException: If user is not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not verified"
        )
    
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_verified_user),
) -> User:
    """
    Get current admin user.
    
    Args:
        current_user: Current verified user
        
    Returns:
        Current admin user
        
    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return current_user


async def get_current_scholar_user(
    current_user: User = Depends(get_current_verified_user),
) -> User:
    """
    Get current scholar user (scholar or admin).
    
    Args:
        current_user: Current verified user
        
    Returns:
        Current scholar user
        
    Raises:
        HTTPException: If user is not scholar or admin
    """
    if current_user.role not in ["scholar", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scholar or admin access required"
        )
    
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_database)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise None.
    
    Args:
        credentials: HTTP authorization credentials
        db: Database session
        
    Returns:
        Current user or None
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        if payload is None:
            return None
        
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        user_service = UserService(db)
        user = await user_service.get_user_by_id(int(user_id))
        
        return user
    except Exception:
        return None