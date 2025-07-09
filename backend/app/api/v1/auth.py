"""
Authentication endpoints for the Breslev Torah Online API.
"""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_database, get_current_user, get_current_active_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    verify_token,
    generate_password_reset_token,
    verify_password_reset_token,
    generate_email_verification_token,
    verify_email_verification_token,
)
from app.core.config import settings
from app.models.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest,
    ResendVerificationRequest,
    ChangePasswordRequest,
    TokenResponse,
    AuthResponse,
    UserResponse,
    LogoutResponse,
    MessageResponse,
)
from app.models.user import User, UserRole
from app.services.user import UserService
from app.services.email import EmailService
from app.services.cache_service import cache_service
from app.utils.logger import logger
from app.utils.monitoring import monitor_endpoint

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@monitor_endpoint("/auth/register")
async def register(
    user_data: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
) -> AuthResponse:
    """
    Register a new user.
    
    Args:
        user_data: User registration data
        background_tasks: Background tasks for email sending
        db: Database session
        
    Returns:
        Authentication response with user data and tokens
        
    Raises:
        HTTPException: If email already exists or validation fails
    """
    user_service = UserService(db)
    email_service = EmailService()
    
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        role=UserRole.STUDENT,  # Default role
        is_active=True,
        is_verified=False,
        preferred_language=user_data.preferred_language,
    )
    
    created_user = await user_service.create_user(user)
    
    # Generate tokens
    access_token = create_access_token(
        data={"sub": str(created_user.id), "email": created_user.email}
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(created_user.id), "email": created_user.email}
    )
    
    # Generate email verification token
    verification_token = generate_email_verification_token(created_user.email)
    
    # Send verification email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        created_user.email,
        created_user.name,
        verification_token
    )
    
    # Cache refresh token
    await cache_service.set(
        f"refresh_token:{created_user.id}",
        refresh_token,
        ttl=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    logger.info(f"User registered successfully: {created_user.email}")
    
    return AuthResponse(
        user=UserResponse.from_orm(created_user),
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=AuthResponse)
@monitor_endpoint("/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_database),
) -> AuthResponse:
    """
    Login user with email and password.
    
    Args:
        form_data: OAuth2 password form data
        db: Database session
        
    Returns:
        Authentication response with user data and tokens
        
    Raises:
        HTTPException: If credentials are invalid
    """
    user_service = UserService(db)
    
    # Get user by email
    user = await user_service.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    await user_service.update_last_login(user.id)
    
    # Generate tokens
    token_data = {"sub": str(user.id), "email": user.email}
    
    # Check if remember me is requested
    remember_me = form_data.client_id == "remember"
    
    if remember_me:
        access_token_expires = timedelta(days=30)
        refresh_token_expires = timedelta(days=90)
    else:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data=token_data,
        expires_delta=refresh_token_expires
    )
    
    # Cache refresh token
    await cache_service.set(
        f"refresh_token:{user.id}",
        refresh_token,
        ttl=int(refresh_token_expires.total_seconds())
    )
    
    logger.info(f"User logged in successfully: {user.email}")
    
    return AuthResponse(
        user=UserResponse.from_orm(user),
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(access_token_expires.total_seconds()),
    )


@router.post("/refresh", response_model=TokenResponse)
@monitor_endpoint("/auth/refresh")
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_database),
) -> TokenResponse:
    """
    Refresh access token using refresh token.
    
    Args:
        token_data: Refresh token data
        db: Database session
        
    Returns:
        New token response
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    user_service = UserService(db)
    
    # Verify refresh token
    payload = verify_token(token_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if refresh token is cached
    cached_token = await cache_service.get(f"refresh_token:{user_id}")
    if cached_token != token_data.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    user = await user_service.get_user_by_id(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new tokens
    new_token_data = {"sub": str(user.id), "email": user.email}
    
    new_access_token = create_access_token(data=new_token_data)
    new_refresh_token = create_refresh_token(data=new_token_data)
    
    # Update cached refresh token
    await cache_service.set(
        f"refresh_token:{user.id}",
        new_refresh_token,
        ttl=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    logger.info(f"Token refreshed for user: {user.email}")
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=LogoutResponse)
@monitor_endpoint("/auth/logout")
async def logout(
    current_user: User = Depends(get_current_user),
) -> LogoutResponse:
    """
    Logout current user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Logout response
    """
    # Remove refresh token from cache
    await cache_service.delete(f"refresh_token:{current_user.id}")
    
    # Could also add token to blacklist here
    
    logger.info(f"User logged out: {current_user.email}")
    
    return LogoutResponse()


@router.get("/me", response_model=UserResponse)
@monitor_endpoint("/auth/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    return UserResponse.from_orm(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
@monitor_endpoint("/auth/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
) -> MessageResponse:
    """
    Request password reset.
    
    Args:
        request: Password reset request
        background_tasks: Background tasks for email sending
        db: Database session
        
    Returns:
        Message response
    """
    user_service = UserService(db)
    email_service = EmailService()
    
    # Get user by email
    user = await user_service.get_user_by_email(request.email)
    
    if user:
        # Generate password reset token
        reset_token = generate_password_reset_token(user.email)
        
        # Send password reset email in background
        background_tasks.add_task(
            email_service.send_password_reset_email,
            user.email,
            user.name,
            reset_token
        )
        
        logger.info(f"Password reset requested for: {user.email}")
    
    # Always return success to avoid email enumeration
    return MessageResponse(message="Password reset email sent")


@router.post("/reset-password", response_model=MessageResponse)
@monitor_endpoint("/auth/reset-password")
async def reset_password(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_database),
) -> MessageResponse:
    """
    Reset password using reset token.
    
    Args:
        request: Password reset confirmation
        db: Database session
        
    Returns:
        Message response
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    user_service = UserService(db)
    
    # Verify reset token
    email = verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user by email
    user = await user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    new_password_hash = get_password_hash(request.new_password)
    await user_service.update_password(user.id, new_password_hash)
    
    # Invalidate all refresh tokens for this user
    await cache_service.delete(f"refresh_token:{user.id}")
    
    logger.info(f"Password reset completed for: {user.email}")
    
    return MessageResponse(message="Password reset successfully")


@router.post("/verify-email", response_model=MessageResponse)
@monitor_endpoint("/auth/verify-email")
async def verify_email(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_database),
) -> MessageResponse:
    """
    Verify email address using verification token.
    
    Args:
        request: Email verification request
        db: Database session
        
    Returns:
        Message response
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    user_service = UserService(db)
    
    # Verify email token
    email = verify_email_verification_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Get user by email
    user = await user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        return MessageResponse(message="Email already verified")
    
    # Update user verification status
    await user_service.verify_user(user.id)
    
    logger.info(f"Email verified for: {user.email}")
    
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
@monitor_endpoint("/auth/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
) -> MessageResponse:
    """
    Resend email verification.
    
    Args:
        request: Resend verification request
        background_tasks: Background tasks for email sending
        db: Database session
        
    Returns:
        Message response
    """
    user_service = UserService(db)
    email_service = EmailService()
    
    # Get user by email
    user = await user_service.get_user_by_email(request.email)
    
    if user and not user.is_verified:
        # Generate new verification token
        verification_token = generate_email_verification_token(user.email)
        
        # Send verification email in background
        background_tasks.add_task(
            email_service.send_verification_email,
            user.email,
            user.name,
            verification_token
        )
        
        logger.info(f"Verification email resent to: {user.email}")
    
    # Always return success to avoid email enumeration
    return MessageResponse(message="Verification email sent")


@router.post("/change-password", response_model=MessageResponse)
@monitor_endpoint("/auth/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_database),
) -> MessageResponse:
    """
    Change password for current user.
    
    Args:
        request: Change password request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Message response
        
    Raises:
        HTTPException: If current password is incorrect
    """
    user_service = UserService(db)
    
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_password_hash = get_password_hash(request.new_password)
    await user_service.update_password(current_user.id, new_password_hash)
    
    # Invalidate all refresh tokens for this user
    await cache_service.delete(f"refresh_token:{current_user.id}")
    
    logger.info(f"Password changed for: {current_user.email}")
    
    return MessageResponse(message="Password changed successfully")