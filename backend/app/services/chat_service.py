"""
Chat service for handling AI-powered conversations about Breslov texts.
"""
import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func
from sqlalchemy.orm import selectinload

from app.models.chat import (
    ChatMessage,
    ChatSession,
    ChatMessageCreate,
    ChatMessageRead,
    ChatRequest,
    ChatResponse,
    ChatRole,
    ChatCitation,
    ChatSessionCreate,
    ChatSessionRead,
)
from app.models.user import User
from app.services.real_gemini_manager import RealGeminiManager
from app.services.sefaria_client import SefariaClient
from app.services.cache_service import cache_service
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ChatService:
    """Service for managing AI-powered chat conversations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.gemini_manager = RealGeminiManager()
        self.sefaria_client = SefariaClient()
    
    async def create_session(
        self,
        user_id: UUID,
        session_data: ChatSessionCreate
    ) -> ChatSessionRead:
        """Create a new chat session."""
        session_id = str(uuid4())
        
        session = ChatSession(
            id=session_id,
            user_id=user_id,
            title=session_data.title or "New Chat",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True,
            total_messages=0,
            last_activity=datetime.utcnow()
        )
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        logger.info(f"Created new chat session: {session_id} for user: {user_id}")
        
        return ChatSessionRead(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            total_messages=session.total_messages,
            last_activity=session.last_activity,
            is_active=session.is_active
        )
    
    async def get_session(
        self,
        session_id: str,
        user_id: UUID
    ) -> Optional[ChatSessionRead]:
        """Get a chat session by ID."""
        result = await self.db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                    ChatSession.is_active == True
                )
            )
        )
        
        session = result.scalar_one_or_none()
        if not session:
            return None
        
        return ChatSessionRead(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            total_messages=session.total_messages,
            last_activity=session.last_activity,
            is_active=session.is_active
        )
    
    async def get_user_sessions(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatSessionRead]:
        """Get all chat sessions for a user."""
        result = await self.db.execute(
            select(ChatSession)
            .where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.is_active == True
                )
            )
            .order_by(desc(ChatSession.last_activity))
            .limit(limit)
            .offset(offset)
        )
        
        sessions = result.scalars().all()
        
        return [
            ChatSessionRead(
                id=session.id,
                user_id=session.user_id,
                title=session.title,
                created_at=session.created_at,
                updated_at=session.updated_at,
                total_messages=session.total_messages,
                last_activity=session.last_activity,
                is_active=session.is_active
            )
            for session in sessions
        ]
    
    async def get_session_messages(
        self,
        session_id: str,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> List[ChatMessageRead]:
        """Get messages from a chat session."""
        result = await self.db.execute(
            select(ChatMessage)
            .where(
                and_(
                    ChatMessage.session_id == session_id,
                    ChatMessage.user_id == user_id
                )
            )
            .order_by(ChatMessage.created_at)
            .limit(limit)
            .offset(offset)
        )
        
        messages = result.scalars().all()
        
        return [
            ChatMessageRead(
                id=message.id,
                role=message.role,
                content=message.content,
                session_id=message.session_id,
                user_id=message.user_id,
                created_at=message.created_at,
                message_metadata=json.loads(message.message_metadata) if message.message_metadata else None,
                context_used=message.context_used,
                citations=json.loads(message.citations) if message.citations else None,
                model_used=message.model_used,
                tokens_used=message.tokens_used,
                response_time_ms=message.response_time_ms,
                user_rating=message.user_rating
            )
            for message in messages
        ]
    
    async def _search_relevant_context(
        self,
        query: str,
        book_filter: Optional[str] = None,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for relevant context from Breslov texts."""
        try:
            # Use Sefaria client to search for relevant texts
            search_results = await self.sefaria_client.search_texts(
                query=query,
                book_filter=book_filter,
                limit=max_results
            )
            
            context_results = []
            for result in search_results:
                context_results.append({
                    "text": result.get("text", ""),
                    "ref": result.get("ref", ""),
                    "book": result.get("book", ""),
                    "chapter": result.get("chapter"),
                    "verse": result.get("verse"),
                    "score": result.get("score", 0.0)
                })
            
            return context_results
            
        except Exception as e:
            logger.error(f"Error searching context: {e}")
            return []
    
    async def _generate_response(
        self,
        message: str,
        context: List[Dict[str, Any]],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Generate AI response using Gemini."""
        try:
            # Prepare context for the prompt
            context_text = ""
            if context:
                context_text = "\n\n**Relevant texts from Breslov literature:**\n"
                for ctx in context:
                    context_text += f"- {ctx['ref']}: {ctx['text']}\n"
            
            # Create prompt
            system_prompt = f"""You are a knowledgeable assistant specializing in Breslov Chassidic texts and teachings. 
            You help users understand the writings of Rabbi Nachman of Breslov and related works.
            
            When answering:
            1. Always provide accurate information based on the texts
            2. If you reference a specific text, cite it properly
            3. Be respectful and spiritual in your approach
            4. If you don't know something, say so honestly
            5. Respond in {language} language
            
            {context_text}
            
            User question: {message}
            
            Please provide a thoughtful response based on the Breslov teachings."""
            
            # Generate response using Gemini
            response_data = await self.gemini_manager.generate_response(
                prompt=system_prompt,
                context=context_text,
                language=language
            )
            
            return {
                "response": response_data.get("response", ""),
                "model_used": response_data.get("model_used", "gemini-1.5-pro"),
                "tokens_used": response_data.get("tokens_used", 0),
                "response_time_ms": response_data.get("response_time_ms", 0)
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "response": "I apologize, but I encountered an error while processing your question. Please try again.",
                "model_used": "error",
                "tokens_used": 0,
                "response_time_ms": 0
            }
    
    async def process_message(
        self,
        user_id: UUID,
        chat_request: ChatRequest
    ) -> ChatResponse:
        """Process a chat message and generate response."""
        start_time = time.time()
        
        try:
            # Validate session exists
            session = await self.get_session(chat_request.session_id, user_id)
            if not session:
                # Create new session if it doesn't exist
                session_create = ChatSessionCreate(title=f"Chat {chat_request.session_id[:8]}")
                session = await self.create_session(user_id, session_create)
            
            # Search for relevant context
            context = await self._search_relevant_context(
                query=chat_request.message,
                book_filter=chat_request.book_filter,
                max_results=5
            )
            
            # Generate AI response
            ai_response = await self._generate_response(
                message=chat_request.message,
                context=context,
                language=chat_request.language
            )
            
            # Save user message
            user_message = ChatMessage(
                id=uuid4(),
                role=ChatRole.USER,
                content=chat_request.message,
                session_id=chat_request.session_id,
                user_id=user_id,
                created_at=datetime.utcnow(),
                context_used=len(context) > 0,
                citations=json.dumps(context) if context else None,
                model_used=None,
                tokens_used=None,
                response_time_ms=None
            )
            
            self.db.add(user_message)
            
            # Save assistant response
            assistant_message = ChatMessage(
                id=uuid4(),
                role=ChatRole.ASSISTANT,
                content=ai_response["response"],
                session_id=chat_request.session_id,
                user_id=user_id,
                created_at=datetime.utcnow(),
                context_used=len(context) > 0,
                citations=json.dumps(context) if context else None,
                model_used=ai_response["model_used"],
                tokens_used=ai_response["tokens_used"],
                response_time_ms=int((time.time() - start_time) * 1000)
            )
            
            self.db.add(assistant_message)
            
            # Update session
            await self.db.execute(
                select(ChatSession)
                .where(ChatSession.id == chat_request.session_id)
                .values(
                    total_messages=ChatSession.total_messages + 2,
                    last_activity=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
            )
            
            await self.db.commit()
            
            # Prepare citations
            citations = [
                {
                    "index": i,
                    "ref": ctx["ref"],
                    "text": ctx["text"],
                    "book": ctx["book"],
                    "chapter": ctx.get("chapter"),
                    "verse": ctx.get("verse"),
                    "score": ctx.get("score")
                }
                for i, ctx in enumerate(context)
            ]
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            logger.info(f"Chat message processed in {response_time_ms}ms for user: {user_id}")
            
            return ChatResponse(
                response=ai_response["response"],
                session_id=chat_request.session_id,
                message_id=assistant_message.id,
                citations=citations,
                context_used=len(context) > 0,
                model_used=ai_response["model_used"],
                tokens_used=ai_response["tokens_used"],
                response_time_ms=response_time_ms
            )
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            response_time_ms = int((time.time() - start_time) * 1000)
            
            return ChatResponse(
                response="I apologize, but I encountered an error while processing your message. Please try again.",
                session_id=chat_request.session_id,
                message_id=uuid4(),
                citations=[],
                context_used=False,
                model_used="error",
                tokens_used=0,
                response_time_ms=response_time_ms
            )
    
    async def stream_response(
        self,
        user_id: UUID,
        chat_request: ChatRequest
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream AI response for real-time chat."""
        start_time = time.time()
        
        try:
            # Validate session
            session = await self.get_session(chat_request.session_id, user_id)
            if not session:
                session_create = ChatSessionCreate(title=f"Chat {chat_request.session_id[:8]}")
                session = await self.create_session(user_id, session_create)
            
            # Search context
            context = await self._search_relevant_context(
                query=chat_request.message,
                book_filter=chat_request.book_filter,
                max_results=5
            )
            
            # Yield context first
            yield {
                "type": "context",
                "data": {
                    "context_found": len(context) > 0,
                    "citations": context
                }
            }
            
            # Stream AI response
            full_response = ""
            async for chunk in self.gemini_manager.stream_response(
                prompt=chat_request.message,
                context=context,
                language=chat_request.language
            ):
                full_response += chunk
                yield {
                    "type": "chunk",
                    "data": {
                        "chunk": chunk,
                        "session_id": chat_request.session_id
                    }
                }
            
            # Save messages after streaming is complete
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Save user message
            user_message = ChatMessage(
                id=uuid4(),
                role=ChatRole.USER,
                content=chat_request.message,
                session_id=chat_request.session_id,
                user_id=user_id,
                created_at=datetime.utcnow(),
                context_used=len(context) > 0,
                citations=json.dumps(context) if context else None
            )
            
            self.db.add(user_message)
            
            # Save assistant response
            assistant_message = ChatMessage(
                id=uuid4(),
                role=ChatRole.ASSISTANT,
                content=full_response,
                session_id=chat_request.session_id,
                user_id=user_id,
                created_at=datetime.utcnow(),
                context_used=len(context) > 0,
                citations=json.dumps(context) if context else None,
                model_used="gemini-1.5-pro",
                tokens_used=len(full_response.split()) * 1.3,  # Rough estimate
                response_time_ms=response_time_ms
            )
            
            self.db.add(assistant_message)
            await self.db.commit()
            
            # Yield completion
            yield {
                "type": "complete",
                "data": {
                    "message_id": str(assistant_message.id),
                    "response_time_ms": response_time_ms,
                    "tokens_used": assistant_message.tokens_used
                }
            }
            
        except Exception as e:
            logger.error(f"Error in stream response: {e}")
            yield {
                "type": "error",
                "data": {
                    "error": "An error occurred while processing your message",
                    "session_id": chat_request.session_id
                }
            }
    
    async def delete_session(
        self,
        session_id: str,
        user_id: UUID
    ) -> bool:
        """Delete a chat session."""
        try:
            result = await self.db.execute(
                select(ChatSession).where(
                    and_(
                        ChatSession.id == session_id,
                        ChatSession.user_id == user_id
                    )
                )
            )
            
            session = result.scalar_one_or_none()
            if not session:
                return False
            
            # Mark as inactive instead of deleting
            session.is_active = False
            session.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            logger.info(f"Deleted chat session: {session_id} for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False
    
    async def rate_message(
        self,
        message_id: UUID,
        user_id: UUID,
        rating: int
    ) -> bool:
        """Rate a chat message."""
        try:
            result = await self.db.execute(
                select(ChatMessage).where(
                    and_(
                        ChatMessage.id == message_id,
                        ChatMessage.user_id == user_id,
                        ChatMessage.role == ChatRole.ASSISTANT
                    )
                )
            )
            
            message = result.scalar_one_or_none()
            if not message:
                return False
            
            message.user_rating = rating
            await self.db.commit()
            
            logger.info(f"Rated message {message_id} with {rating} stars")
            return True
            
        except Exception as e:
            logger.error(f"Error rating message: {e}")
            return False
    
    async def get_analytics(
        self,
        user_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get chat analytics for a user."""
        try:
            from datetime import timedelta
            
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Total messages
            total_messages_result = await self.db.execute(
                select(func.count(ChatMessage.id)).where(
                    and_(
                        ChatMessage.user_id == user_id,
                        ChatMessage.created_at >= start_date
                    )
                )
            )
            total_messages = total_messages_result.scalar() or 0
            
            # Total sessions
            total_sessions_result = await self.db.execute(
                select(func.count(ChatSession.id)).where(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.created_at >= start_date
                    )
                )
            )
            total_sessions = total_sessions_result.scalar() or 0
            
            # Average response time
            avg_response_time_result = await self.db.execute(
                select(func.avg(ChatMessage.response_time_ms)).where(
                    and_(
                        ChatMessage.user_id == user_id,
                        ChatMessage.created_at >= start_date,
                        ChatMessage.role == ChatRole.ASSISTANT
                    )
                )
            )
            avg_response_time = avg_response_time_result.scalar() or 0
            
            return {
                "user_id": str(user_id),
                "period_days": days,
                "total_messages": total_messages,
                "total_sessions": total_sessions,
                "avg_response_time_ms": int(avg_response_time),
                "period_start": start_date.isoformat(),
                "period_end": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return {
                "user_id": str(user_id),
                "period_days": days,
                "total_messages": 0,
                "total_sessions": 0,
                "avg_response_time_ms": 0,
                "period_start": start_date.isoformat(),
                "period_end": datetime.utcnow().isoformat()
            }