"""Initial migration: Create all tables

Revision ID: 20250709_064852
Revises: 
Create Date: 2025-07-09 06:48:52.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250709_064852'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'scholar', 'student', 'guest')")
    op.execute("CREATE TYPE messagetype AS ENUM ('user', 'assistant', 'system')")
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', postgresql.ENUM('admin', 'scholar', 'student', 'guest', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('preferred_language', sa.String(2), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('study_level', sa.String(20), nullable=True),
        sa.Column('preferences', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    
    # Create books table
    op.create_table(
        'books',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('author', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('language', sa.String(5), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('difficulty_level', sa.String(20), nullable=False),
        sa.Column('total_chapters', sa.Integer(), nullable=False),
        sa.Column('total_texts', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_books_id', 'books', ['id'], unique=False)
    op.create_index('ix_books_title', 'books', ['title'], unique=False)
    op.create_index('ix_books_language', 'books', ['language'], unique=False)
    op.create_index('ix_books_category', 'books', ['category'], unique=False)
    
    # Create texts table
    op.create_table(
        'texts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=False),
        sa.Column('chapter', sa.Integer(), nullable=False),
        sa.Column('verse', sa.Integer(), nullable=True),
        sa.Column('section', sa.String(100), nullable=True),
        sa.Column('content_hebrew', sa.Text(), nullable=True),
        sa.Column('content_english', sa.Text(), nullable=True),
        sa.Column('content_french', sa.Text(), nullable=True),
        sa.Column('transliteration', sa.Text(), nullable=True),
        sa.Column('commentary', sa.Text(), nullable=True),
        sa.Column('audio_url_hebrew', sa.String(), nullable=True),
        sa.Column('audio_url_english', sa.String(), nullable=True),
        sa.Column('audio_url_french', sa.String(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False),
        sa.Column('embedding', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_texts_id', 'texts', ['id'], unique=False)
    op.create_index('ix_texts_book_id', 'texts', ['book_id'], unique=False)
    op.create_index('ix_texts_chapter', 'texts', ['chapter'], unique=False)
    
    # Create chats table
    op.create_table(
        'chats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('language', sa.String(5), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chats_id', 'chats', ['id'], unique=False)
    op.create_index('ix_chats_user_id', 'chats', ['user_id'], unique=False)
    
    # Create chatmessages table
    op.create_table(
        'chatmessages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chat_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', postgresql.ENUM('user', 'assistant', 'system', name='messagetype'), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['chat_id'], ['chats.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chatmessages_id', 'chatmessages', ['id'], unique=False)
    op.create_index('ix_chatmessages_chat_id', 'chatmessages', ['chat_id'], unique=False)
    
    # Create bookmarks table
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('text_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=False),
        sa.Column('is_favorite', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['text_id'], ['texts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bookmarks_id', 'bookmarks', ['id'], unique=False)
    op.create_index('ix_bookmarks_user_id', 'bookmarks', ['user_id'], unique=False)
    op.create_index('ix_bookmarks_text_id', 'bookmarks', ['text_id'], unique=False)
    
    # Create studyprogresses table
    op.create_table(
        'studyprogresses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=False),
        sa.Column('texts_read', sa.JSON(), nullable=False),
        sa.Column('current_chapter', sa.Integer(), nullable=False),
        sa.Column('current_verse', sa.Integer(), nullable=True),
        sa.Column('completion_percentage', sa.Float(), nullable=False),
        sa.Column('study_time_minutes', sa.Integer(), nullable=False),
        sa.Column('last_read_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_studyprogresses_id', 'studyprogresses', ['id'], unique=False)
    op.create_index('ix_studyprogresses_user_id', 'studyprogresses', ['user_id'], unique=False)
    op.create_index('ix_studyprogresses_book_id', 'studyprogresses', ['book_id'], unique=False)
    
    # Create unique constraints
    op.create_unique_constraint('uq_bookmark_user_text', 'bookmarks', ['user_id', 'text_id'])
    op.create_unique_constraint('uq_progress_user_book', 'studyprogresses', ['user_id', 'book_id'])


def downgrade() -> None:
    # Drop tables in reverse order due to foreign key constraints
    op.drop_table('studyprogresses')
    op.drop_table('bookmarks')
    op.drop_table('chatmessages')
    op.drop_table('chats')
    op.drop_table('texts')
    op.drop_table('books')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS messagetype")
    op.execute("DROP TYPE IF EXISTS userrole")