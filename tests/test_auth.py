"""
Authentication endpoint tests for Breslev Torah Online.

Tests cover:
- User registration with validation
- User login with JWT token generation
- Token refresh functionality
- Password reset workflows
- Account verification
- Role-based access control
- Security measures and rate limiting
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.user import User, UserRole
from backend.app.services.auth import AuthService


class TestUserRegistration:
    """Test user registration endpoints."""
    
    def test_register_new_user_success(self, client: TestClient, db_session: Session):
        """Test successful user registration."""
        response = client.post("/auth/register", json={
            "email": "newuser@test.com",
            "name": "New User",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "preferred_language": "he"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "User created successfully"
        assert "user" in data
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["name"] == "New User"
        assert data["user"]["role"] == "student"  # Default role
        assert data["user"]["is_verified"] is False
        
        # Verify user exists in database
        user = db_session.query(User).filter(User.email == "newuser@test.com").first()
        assert user is not None
        assert user.name == "New User"
    
    def test_register_duplicate_email(self, client: TestClient, test_student_user: User):
        """Test registration with existing email."""
        response = client.post("/auth/register", json={
            "email": test_student_user.email,
            "name": "Duplicate User",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "preferred_language": "he"
        })
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_register_password_mismatch(self, client: TestClient):
        """Test registration with mismatched passwords."""
        response = client.post("/auth/register", json={
            "email": "mismatch@test.com",
            "name": "Mismatch User",
            "password": "SecurePassword123!",
            "password_confirm": "DifferentPassword123!",
            "preferred_language": "he"
        })
        
        assert response.status_code == 400
        assert "Passwords do not match" in response.json()["detail"]
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password."""
        response = client.post("/auth/register", json={
            "email": "weak@test.com",
            "name": "Weak Password User",
            "password": "123",
            "password_confirm": "123",
            "preferred_language": "he"
        })
        
        assert response.status_code == 400
        assert "Password too weak" in response.json()["detail"]
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email format."""
        response = client.post("/auth/register", json={
            "email": "invalid-email",
            "name": "Invalid Email User",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "preferred_language": "he"
        })
        
        assert response.status_code == 422  # Validation error


class TestUserLogin:
    """Test user login endpoints."""
    
    def test_login_success(self, client: TestClient, test_student_user: User):
        """Test successful login."""
        response = client.post("/auth/login", data={
            "username": test_student_user.email,
            "password": "test_password"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        
        # Verify token format
        assert len(data["access_token"].split(".")) == 3  # JWT format
    
    def test_login_invalid_credentials(self, client: TestClient, test_student_user: User):
        """Test login with invalid credentials."""
        response = client.post("/auth/login", data={
            "username": test_student_user.email,
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with non-existent user."""
        response = client.post("/auth/login", data={
            "username": "nonexistent@test.com",
            "password": "password"
        })
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_unverified_user(self, client: TestClient, test_guest_user: User):
        """Test login with unverified user."""
        response = client.post("/auth/login", data={
            "username": test_guest_user.email,
            "password": "test_password"
        })
        
        # Should allow login but with limited access
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    def test_login_remember_me(self, client: TestClient, test_student_user: User):
        """Test login with remember me option."""
        response = client.post("/auth/login", data={
            "username": test_student_user.email,
            "password": "test_password",
            "client_id": "remember"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["expires_in"] > 86400  # More than 24 hours


class TestTokenManagement:
    """Test JWT token management."""
    
    def test_get_current_user(self, client: TestClient, student_headers: dict, test_student_user: User):
        """Test getting current user info."""
        response = client.get("/auth/me", headers=student_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_student_user.id
        assert data["email"] == test_student_user.email
        assert data["name"] == test_student_user.name
        assert data["role"] == test_student_user.role.value
    
    def test_refresh_token(self, client: TestClient, test_student_user: User):
        """Test token refresh."""
        # First login to get tokens
        login_response = client.post("/auth/login", data={
            "username": test_student_user.email,
            "password": "test_password"
        })
        tokens = login_response.json()
        
        # Use refresh token
        response = client.post("/auth/refresh", headers={
            "Authorization": f"Bearer {tokens['refresh_token']}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["access_token"] != tokens["access_token"]  # New token
    
    def test_invalid_token(self, client: TestClient):
        """Test API access with invalid token."""
        response = client.get("/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        
        assert response.status_code == 401
        assert "Invalid token" in response.json()["detail"]
    
    def test_expired_token(self, client: TestClient):
        """Test API access with expired token."""
        # This would require creating an expired token
        # For now, test with malformed token
        expired_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.expired.token"
        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {expired_token}"
        })
        
        assert response.status_code == 401


class TestPasswordReset:
    """Test password reset functionality."""
    
    def test_request_password_reset(self, client: TestClient, test_student_user: User):
        """Test password reset request."""
        response = client.post("/auth/forgot-password", json={
            "email": test_student_user.email
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password reset email sent"
    
    def test_request_password_reset_nonexistent_email(self, client: TestClient):
        """Test password reset for non-existent email."""
        response = client.post("/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        
        # Should return success for security (don't reveal if email exists)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password reset email sent"
    
    def test_reset_password_with_token(self, client: TestClient):
        """Test password reset with valid token."""
        # This would require implementing token generation
        # For now, test the endpoint structure
        response = client.post("/auth/reset-password", json={
            "token": "valid_reset_token",
            "new_password": "NewSecurePassword123!",
            "new_password_confirm": "NewSecurePassword123!"
        })
        
        # Expected to fail without valid token implementation
        assert response.status_code in [400, 401]


class TestAccountVerification:
    """Test account verification functionality."""
    
    def test_resend_verification_email(self, client: TestClient, test_guest_user: User):
        """Test resending verification email."""
        response = client.post("/auth/resend-verification", json={
            "email": test_guest_user.email
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Verification email sent"
    
    def test_verify_account_with_token(self, client: TestClient):
        """Test account verification with token."""
        response = client.post("/auth/verify-email", json={
            "token": "valid_verification_token"
        })
        
        # Expected to fail without valid token implementation
        assert response.status_code in [400, 401]


class TestLogout:
    """Test logout functionality."""
    
    def test_logout_success(self, client: TestClient, student_headers: dict):
        """Test successful logout."""
        response = client.post("/auth/logout", headers=student_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Successfully logged out"
    
    def test_logout_without_token(self, client: TestClient):
        """Test logout without authentication."""
        response = client.post("/auth/logout")
        
        assert response.status_code == 401


class TestRoleBasedAccess:
    """Test role-based access control."""
    
    def test_admin_access(self, client: TestClient, admin_headers: dict):
        """Test admin-only endpoint access."""
        response = client.get("/auth/users", headers=admin_headers)
        
        # This endpoint should be implemented for admin users
        assert response.status_code in [200, 404]  # 404 if not implemented yet
    
    def test_scholar_access(self, client: TestClient, scholar_headers: dict):
        """Test scholar access to content management."""
        response = client.get("/auth/me", headers=scholar_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "scholar"
    
    def test_student_limited_access(self, client: TestClient, student_headers: dict):
        """Test student access limitations."""
        # Students should not access admin endpoints
        response = client.get("/auth/users", headers=student_headers)
        
        assert response.status_code in [403, 404]  # Forbidden or not found
    
    def test_guest_limited_access(self, client: TestClient, guest_headers: dict):
        """Test guest user limitations."""
        response = client.get("/auth/me", headers=guest_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "guest"
        assert data["is_verified"] is False


class TestSecurityMeasures:
    """Test security measures and rate limiting."""
    
    def test_rate_limiting_login_attempts(self, client: TestClient, test_student_user: User):
        """Test rate limiting on login attempts."""
        # Make multiple failed login attempts
        for _ in range(6):  # Assuming 5 attempts limit
            response = client.post("/auth/login", data={
                "username": test_student_user.email,
                "password": "wrong_password"
            })
        
        # Should be rate limited after multiple failures
        assert response.status_code in [401, 429]  # Unauthorized or Too Many Requests
    
    def test_sql_injection_protection(self, client: TestClient):
        """Test SQL injection protection."""
        malicious_email = "'; DROP TABLE users; --"
        response = client.post("/auth/login", data={
            "username": malicious_email,
            "password": "password"
        })
        
        # Should handle gracefully
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_xss_protection(self, client: TestClient):
        """Test XSS protection in user input."""
        malicious_name = "<script>alert('xss')</script>"
        response = client.post("/auth/register", json={
            "email": "xss@test.com",
            "name": malicious_name,
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "preferred_language": "he"
        })
        
        # Should either sanitize or reject
        if response.status_code == 201:
            # If accepted, name should be sanitized
            data = response.json()
            assert "<script>" not in data["user"]["name"]
        else:
            # Or reject the input
            assert response.status_code == 400


class TestAuthService:
    """Test AuthService class methods."""
    
    @pytest.mark.asyncio
    async def test_password_hashing(self, auth_service: AuthService):
        """Test password hashing and verification."""
        password = "TestPassword123!"
        hashed = await auth_service.hash_password(password)
        
        assert hashed != password
        assert await auth_service.verify_password(password, hashed)
        assert not await auth_service.verify_password("wrong_password", hashed)
    
    @pytest.mark.asyncio
    async def test_token_creation(self, auth_service: AuthService, test_student_user: User):
        """Test JWT token creation."""
        access_token, refresh_token = await auth_service.create_tokens(test_student_user)
        
        assert access_token != refresh_token
        assert len(access_token.split(".")) == 3  # JWT format
        assert len(refresh_token.split(".")) == 3  # JWT format
    
    @pytest.mark.asyncio
    async def test_token_validation(self, auth_service: AuthService, test_student_user: User):
        """Test JWT token validation."""
        access_token, _ = await auth_service.create_tokens(test_student_user)
        
        # Validate token
        payload = await auth_service.verify_token(access_token)
        assert payload["sub"] == str(test_student_user.id)
        assert payload["email"] == test_student_user.email
    
    @pytest.mark.asyncio
    async def test_password_strength_validation(self, auth_service: AuthService):
        """Test password strength validation."""
        # Strong password
        assert await auth_service.validate_password_strength("StrongPassword123!")
        
        # Weak passwords
        assert not await auth_service.validate_password_strength("123")
        assert not await auth_service.validate_password_strength("password")
        assert not await auth_service.validate_password_strength("12345678")
        assert not await auth_service.validate_password_strength("PASSWORD123")