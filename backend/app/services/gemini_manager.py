import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
import os
from typing import Dict, List, Optional
import json
import hashlib
import asyncio
from pathlib import Path

class GeminiContextManager:
    """Gestionnaire de contexte intelligent pour Gemini 1.5 Pro"""
    
    def __init__(self):
        # Configuration Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY non trouvé dans les variables d'environnement")
        
        genai.configure(api_key=api_key)
        
        # Gemini 1.5 Pro avec 2M tokens!
        self.model = genai.GenerativeModel('gemini-1.5-pro-latest')
        self.flash_model = genai.GenerativeModel('gemini-1.5-flash')
        
        # ChromaDB pour recherche vectorielle
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        self.embedding_fn = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
            api_key=api_key,
            model_name="models/text-embedding-004"
        )
        
        # Cache des résumés de livres
        self.summaries = {}
        self.summaries_file = Path("data/book_summaries.json")
        self._load_summaries()
        
        # Statut d'initialisation
        self.initialized_books = set()
        
    def _load_summaries(self):
        """Charge les résumés de livres depuis le cache"""
        if self.summaries_file.exists():
            try:
                with open(self.summaries_file, 'r', encoding='utf-8') as f:
                    self.summaries = json.load(f)
                print(f"📚 Résumés chargés pour {len(self.summaries)} livres")
            except:
                self.summaries = {}
        else:
            self.summaries = {}
    
    def _save_summaries(self):
        """Sauvegarde les résumés de livres"""
        self.summaries_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.summaries_file, 'w', encoding='utf-8') as f:
            json.dump(self.summaries, f, ensure_ascii=False, indent=2)
    
    async def prepare_book(self, book_name: str, book_data: Dict):
        """Prépare un livre pour l'IA avec chunking intelligent"""
        
        if book_name in self.initialized_books:
            print(f"📖 {book_name} déjà préparé")
            return True
        
        print(f"🔧 Préparation de {book_name} pour l'IA...")
        
        try:
            # Créer collection ChromaDB
            collection = self.chroma_client.get_or_create_collection(
                name=f"breslov_{book_name.lower().replace(' ', '_')}",
                embedding_function=self.embedding_fn,
                metadata={"book": book_name}
            )
            
            # Chunker intelligemment
            chunks = []
            chunk_id = 0
            
            for ref, content in book_data.get('sections', {}).items():
                hebrew_text = content.get('hebrew', '')
                english_text = content.get('english', '')
                
                # Combiner hébreu et anglais pour l'embedding
                combined_text = f"{hebrew_text}\n\n{english_text}"
                
                # Créer des chunks de taille appropriée (max 1000 caractères)
                if len(combined_text) > 1000:
                    # Diviser en chunks plus petits
                    words = combined_text.split()
                    current_chunk = []
                    current_length = 0
                    
                    for word in words:
                        if current_length + len(word) > 800:  # Marge de sécurité
                            if current_chunk:
                                chunk = {
                                    'id': f"{book_name}_{ref}_{chunk_id}",
                                    'text': ' '.join(current_chunk),
                                    'metadata': {
                                        'book': book_name,
                                        'ref': ref,
                                        'hebrew': hebrew_text,
                                        'english': english_text,
                                        'chunk_id': chunk_id
                                    }
                                }
                                chunks.append(chunk)
                                chunk_id += 1
                                current_chunk = []
                                current_length = 0
                        
                        current_chunk.append(word)
                        current_length += len(word) + 1
                    
                    # Dernier chunk
                    if current_chunk:
                        chunk = {
                            'id': f"{book_name}_{ref}_{chunk_id}",
                            'text': ' '.join(current_chunk),
                            'metadata': {
                                'book': book_name,
                                'ref': ref,
                                'hebrew': hebrew_text,
                                'english': english_text,
                                'chunk_id': chunk_id
                            }
                        }
                        chunks.append(chunk)
                        chunk_id += 1
                else:
                    # Chunk simple
                    chunk = {
                        'id': f"{book_name}_{ref}_{chunk_id}",
                        'text': combined_text,
                        'metadata': {
                            'book': book_name,
                            'ref': ref,
                            'hebrew': hebrew_text,
                            'english': english_text,
                            'chunk_id': chunk_id
                        }
                    }
                    chunks.append(chunk)
                    chunk_id += 1
            
            # Ajouter à ChromaDB par batch
            if chunks:
                batch_size = 50
                for i in range(0, len(chunks), batch_size):
                    batch = chunks[i:i+batch_size]
                    collection.add(
                        documents=[c['text'] for c in batch],
                        metadatas=[c['metadata'] for c in batch],
                        ids=[c['id'] for c in batch]
                    )
                    print(f"  📦 Batch {i//batch_size + 1}: {len(batch)} chunks ajoutés")
            
            # Générer résumé maître si pas déjà fait
            if book_name not in self.summaries:
                print(f"  📝 Génération du résumé pour {book_name}...")
                summary = await self._generate_book_summary(book_name, book_data)
                self.summaries[book_name] = summary
                self._save_summaries()
            
            self.initialized_books.add(book_name)
            print(f"✅ {book_name} préparé: {len(chunks)} chunks, résumé disponible")
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la préparation de {book_name}: {e}")
            return False
    
    async def answer_question(self, question: str, book_context: Optional[str] = None, mode: str = "study"):
        """Répond aux questions avec contexte intelligent"""
        
        try:
            # Déterminer la stratégie
            strategy = await self._determine_strategy(question, book_context, mode)
            
            if strategy['type'] == 'single_book':
                return await self._answer_single_book(question, strategy['book'], mode)
            elif strategy['type'] == 'multi_book':
                return await self._answer_multi_book(question, mode)
            else:
                return await self._answer_general(question, mode)
                
        except Exception as e:
            print(f"❌ Erreur Gemini: {e}")
            return {
                'answer': f"Désolé, une erreur est survenue: {str(e)}",
                'error': True,
                'strategy': 'error'
            }
    
    async def _determine_strategy(self, question: str, book_context: Optional[str], mode: str) -> Dict:
        """Détermine la stratégie de réponse optimale"""
        
        # Si contexte de livre spécifié
        if book_context:
            return {
                'type': 'single_book',
                'book': book_context
            }
        
        # Analyser la question pour détecter mention de livres
        question_lower = question.lower()
        mentioned_books = []
        
        for book_name in self.summaries.keys():
            if (book_name.lower() in question_lower or 
                any(word in question_lower for word in book_name.lower().split())):
                mentioned_books.append(book_name)
        
        if len(mentioned_books) == 1:
            return {
                'type': 'single_book',
                'book': mentioned_books[0]
            }
        elif len(mentioned_books) > 1:
            return {
                'type': 'multi_book',
                'books': mentioned_books
            }
        else:
            return {
                'type': 'multi_book',  # Par défaut, chercher dans tous
                'books': list(self.summaries.keys())
            }
    
    async def _answer_single_book(self, question: str, book_name: str, mode: str):
        """Répond pour un livre spécifique"""
        
        try:
            # Recherche vectorielle
            collection_name = f"breslov_{book_name.lower().replace(' ', '_')}"
            collection = self.chroma_client.get_collection(collection_name)
            
            results = collection.query(
                query_texts=[question],
                n_results=10
            )
            
            # Construire contexte
            context_parts = [
                f"📚 LIVRE: {book_name}",
                f"🎯 MODE: {mode.upper()}",
                f"RÉSUMÉ: {self.summaries.get(book_name, 'N/A')}",
                "\nPASSAGES PERTINENTS:"
            ]
            
            for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
                context_parts.append(f"""
Passage {i+1} - {meta['ref']}:
Hébreu: {meta['hebrew'][:300]}...
Anglais: {meta['english'][:300]}...
---""")
            
            # Prompt spécialisé selon le mode
            prompt = self._build_prompt(mode, question, ''.join(context_parts), book_name)
            
            response = self.model.generate_content(prompt)
            
            return {
                'answer': response.text,
                'book': book_name,
                'sources_used': len(results['documents'][0]),
                'strategy': 'single_book',
                'mode': mode,
                'citations': [meta['ref'] for meta in results['metadatas'][0]]
            }
            
        except Exception as e:
            print(f"❌ Erreur single book: {e}")
            raise e
    
    async def _answer_multi_book(self, question: str, mode: str):
        """Répond en consultant plusieurs livres"""
        
        all_results = []
        
        # Chercher dans tous les livres initialisés
        for book_name in self.initialized_books:
            try:
                collection_name = f"breslov_{book_name.lower().replace(' ', '_')}"
                collection = self.chroma_client.get_collection(collection_name)
                results = collection.query(query_texts=[question], n_results=3)
                
                for doc, meta, distance in zip(
                    results['documents'][0], 
                    results['metadatas'][0],
                    results['distances'][0]
                ):
                    all_results.append({
                        'book': book_name,
                        'doc': doc,
                        'meta': meta,
                        'score': 1 - distance  # Convertir distance en score
                    })
            except Exception as e:
                print(f"⚠️ Erreur recherche dans {book_name}: {e}")
                continue
        
        # Trier par pertinence
        all_results.sort(key=lambda x: x['score'], reverse=True)
        top_results = all_results[:15]
        
        # Grouper par livre
        by_book = {}
        for result in top_results:
            book = result['book']
            if book not in by_book:
                by_book[book] = []
            by_book[book].append(result)
        
        # Construire contexte multi-livres
        context_parts = [f"🎯 MODE: {mode.upper()}", "ANALYSE MULTI-LIVRES:\n"]
        
        for book, passages in by_book.items():
            context_parts.append(f"\n📚 {book}:")
            context_parts.append(f"Résumé: {self.summaries.get(book, 'N/A')[:200]}...")
            
            for p in passages[:2]:
                context_parts.append(f"- {p['meta']['ref']}: {p['doc'][:200]}...")
        
        prompt = self._build_prompt(mode, question, ''.join(context_parts), "MULTI-LIVRES")
        
        response = self.model.generate_content(prompt)
        
        return {
            'answer': response.text,
            'books_consulted': list(by_book.keys()),
            'total_sources': len(top_results),
            'strategy': 'multi_book',
            'mode': mode,
            'citations': [r['meta']['ref'] for r in top_results[:10]]
        }
    
    async def _answer_general(self, question: str, mode: str):
        """Réponse générale basée sur la connaissance de Gemini"""
        
        prompt = f"""Tu es un expert des enseignements de Rabbi Nachman de Breslev.

MODE: {mode.upper()}

QUESTION: {question}

Réponds selon le mode spécifié:
- STUDY: Analyse approfondie et académique
- EXPLORATION: Conversation ouverte et exploratoire  
- ANALYSIS: Examen critique et détaillé
- COUNSEL: Guidance spirituelle personnalisée

Utilise tes connaissances générales sur Rabbi Nachman et la tradition Breslov.
Réponds en français, avec profondeur et authenticité.

Réponse:"""
        
        response = self.model.generate_content(prompt)
        
        return {
            'answer': response.text,
            'strategy': 'general_knowledge',
            'mode': mode,
            'sources_used': 0
        }
    
    def _build_prompt(self, mode: str, question: str, context: str, book_context: str) -> str:
        """Construit le prompt selon le mode"""
        
        base_instructions = {
            "study": "Analyse ACADÉMIQUE approfondie avec références précises. Structure claire avec sources exactes.",
            "exploration": "Conversation OUVERTE et exploratoire. Encourage questions et réflexions personnelles.",
            "analysis": "Examen CRITIQUE et détaillé. Montre nuances, contradictions, et perspectives multiples.", 
            "counsel": "Guidance SPIRITUELLE personnalisée. Conseils pratiques pour l'application quotidienne."
        }
        
        instruction = base_instructions.get(mode, base_instructions["study"])
        
        return f"""Tu es un MAÎTRE expert des textes de Rabbi Nachman de Breslev.

CONTEXTE: {book_context}
{context}

QUESTION: {question}

INSTRUCTIONS CRITIQUES:
1. {instruction}
2. Base TOUTE ta réponse sur les textes fournis - JAMAIS de généralités
3. Cite EXACTEMENT avec références (livre, section)
4. Fait des connexions profondes dans les textes
5. Réponds en français fluide et authentique
6. Utilise le contexte hébreu ET anglais fourni

MODE: {mode.upper()}

Réponse complète et profonde:"""
    
    async def _generate_book_summary(self, book_name: str, book_data: Dict) -> str:
        """Génère un résumé structuré du livre"""
        
        # Prendre échantillon représentatif
        sample_sections = list(book_data.get('sections', {}).items())[:10]
        sample_text = "\n\n".join([
            f"{ref}:\nHébreu: {content['hebrew'][:500]}\nAnglais: {content['english'][:500]}" 
            for ref, content in sample_sections
        ])
        
        prompt = f"""Analyse ce livre de Rabbi Nachman '{book_name}' et crée un résumé STRUCTURÉ:

ÉCHANTILLON:
{sample_text[:15000]}

Crée un résumé incluant:
1. THÈMES PRINCIPAUX du livre
2. CONCEPTS CLÉS enseignés
3. STRUCTURE générale
4. ENSEIGNEMENTS PRATIQUES
5. LIENS avec autres textes Breslov

Format: Texte structuré et concis (max 500 mots):"""
        
        try:
            response = self.flash_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"❌ Erreur génération résumé {book_name}: {e}")
            return f"Résumé non disponible pour {book_name}"