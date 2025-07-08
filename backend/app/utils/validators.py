"""
Security validators and sanitizers.
"""
import re
import html
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import bleach

from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class SecurityValidator:
    """
    Validate and sanitize user inputs for security.
    """
    
    # Regex patterns
    EMAIL_PATTERN = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    URL_PATTERN = re.compile(
        r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^<>]*)?$'
    )
    
    SQL_INJECTION_PATTERN = re.compile(
        r'(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript)\b)',
        re.IGNORECASE
    )
    
    XSS_PATTERN = re.compile(
        r'(<script|<iframe|<object|<embed|<form|on\w+=|javascript:|vbscript:)',
        re.IGNORECASE
    )
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        if not email or len(email) > 255:
            return False
        return bool(SecurityValidator.EMAIL_PATTERN.match(email))
    
    @staticmethod
    def validate_url(url: str, allowed_schemes: List[str] = ["http", "https"]) -> bool:
        """Validate URL format and scheme."""
        if not url or len(url) > 2048:
            return False
        
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in allowed_schemes and
                bool(parsed.netloc) and
                bool(SecurityValidator.URL_PATTERN.match(url))
            )
        except Exception:
            return False
    
    @staticmethod
    def sanitize_html(html_content: str, allowed_tags: Optional[List[str]] = None) -> str:
        """Sanitize HTML content."""
        if allowed_tags is None:
            allowed_tags = [
                'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'strong', 'em', 'u', 'i', 'b', 'a', 'ul', 'ol', 'li',
                'blockquote', 'code', 'pre'
            ]
        
        allowed_attributes = {
            'a': ['href', 'title', 'target'],
            'span': ['class'],
            'div': ['class'],
        }
        
        # Clean with bleach
        cleaned = bleach.clean(
            html_content,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        return cleaned
    
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Sanitize plain text input."""
        # Escape HTML entities
        sanitized = html.escape(text)
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())
        
        return sanitized
    
    @staticmethod
    def detect_sql_injection(text: str) -> bool:
        """Detect potential SQL injection attempts."""
        return bool(SecurityValidator.SQL_INJECTION_PATTERN.search(text))
    
    @staticmethod
    def detect_xss(text: str) -> bool:
        """Detect potential XSS attempts."""
        return bool(SecurityValidator.XSS_PATTERN.search(text))
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """Validate password strength and return detailed report."""
        report = {
            "valid": True,
            "score": 0,
            "errors": [],
            "suggestions": []
        }
        
        # Length check
        if len(password) < 8:
            report["valid"] = False
            report["errors"].append("Password must be at least 8 characters")
        elif len(password) < 12:
            report["suggestions"].append("Consider using at least 12 characters")
        else:
            report["score"] += 2
        
        # Character variety
        has_lower = bool(re.search(r'[a-z]', password))
        has_upper = bool(re.search(r'[A-Z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        
        if not has_lower:
            report["errors"].append("Password must contain lowercase letters")
        else:
            report["score"] += 1
        
        if not has_upper:
            report["errors"].append("Password must contain uppercase letters")
        else:
            report["score"] += 1
        
        if not has_digit:
            report["errors"].append("Password must contain numbers")
        else:
            report["score"] += 1
        
        if not has_special:
            report["suggestions"].append("Add special characters for better security")
        else:
            report["score"] += 2
        
        # Common patterns check
        if password.lower() in ['password', '12345678', 'qwerty', 'abc123']:
            report["valid"] = False
            report["errors"].append("Password is too common")
        
        # Sequential characters check
        if re.search(r'(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)', password.lower()):
            report["suggestions"].append("Avoid sequential characters")
            report["score"] -= 1
        
        # Repeated characters check
        if re.search(r'(.)\1{2,}', password):
            report["suggestions"].append("Avoid repeated characters")
            report["score"] -= 1
        
        report["valid"] = report["valid"] and len(report["errors"]) == 0
        report["score"] = max(0, min(10, report["score"]))
        
        return report
    
    @staticmethod
    def validate_file_upload(
        filename: str,
        content_type: str,
        file_size: int,
        allowed_extensions: List[str] = None,
        max_size: int = 10 * 1024 * 1024  # 10MB
    ) -> Dict[str, Any]:
        """Validate file upload for security."""
        result = {
            "valid": True,
            "errors": []
        }
        
        # Check file size
        if file_size > max_size:
            result["valid"] = False
            result["errors"].append(f"File size exceeds maximum of {max_size // 1024 // 1024}MB")
        
        # Check filename
        if not filename or '..' in filename or '/' in filename or '\\' in filename:
            result["valid"] = False
            result["errors"].append("Invalid filename")
        
        # Check extension
        if allowed_extensions:
            ext = filename.lower().split('.')[-1] if '.' in filename else ''
            if ext not in allowed_extensions:
                result["valid"] = False
                result["errors"].append(f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
        
        # Check MIME type
        safe_mime_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'text/csv',
            'application/json', 'audio/mpeg', 'audio/wav'
        ]
        
        if content_type not in safe_mime_types:
            result["valid"] = False
            result["errors"].append("File type not allowed")
        
        return result


# Global validator instance
security_validator = SecurityValidator()