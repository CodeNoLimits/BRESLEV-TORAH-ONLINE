#!/usr/bin/env python3
"""
Alembic migration runner for Breslev Torah Online.
"""
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def run_alembic():
    """Run alembic commands with proper environment setup."""
    
    # Set Python path
    os.environ['PYTHONPATH'] = str(Path(__file__).parent)
    
    # Import and run alembic
    from alembic.config import main
    
    # Run alembic with the provided arguments
    main(argv=sys.argv[1:])

if __name__ == "__main__":
    run_alembic()