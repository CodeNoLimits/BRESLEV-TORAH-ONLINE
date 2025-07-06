import { pgTable, text, serial, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Books table - stores Breslev texts
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  sefariaRef: text("sefaria_ref").notNull().unique(),
  titleHe: text("title_he").notNull(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr"),
  author: text("author").default("Nachman of Breslov"),
  category: text("category").default("Chasidut"),
  content: jsonb("content").notNull(), // Full book content structure
  metadata: jsonb("metadata"), // Additional metadata from Sefaria
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    sefariaRefIdx: index("idx_sefaria_ref").on(table.sefariaRef),
    categoryIdx: index("idx_category").on(table.category)
  };
});

// Chapters table - individual chapters
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  chapterNumber: integer("chapter_number").notNull(),
  sefariaRef: text("sefaria_ref").notNull(),
  titleHe: text("title_he"),
  titleEn: text("title_en"),
  titleFr: text("title_fr"),
  contentHe: text("content_he").notNull(),
  contentEn: text("content_en").notNull(),
  contentFr: text("content_fr"), // Cached French translation
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    bookChapterIdx: index("idx_book_chapter").on(table.bookId, table.chapterNumber),
    sefariaRefIdx: index("idx_chapter_sefaria_ref").on(table.sefariaRef)
  };
});

// Translations table - cached translations
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  sourceText: text("source_text").notNull(),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  translatedText: text("translated_text").notNull(),
  chunkIndex: integer("chunk_index").default(0),
  totalChunks: integer("total_chunks").default(1),
  reference: text("reference"), // Optional Sefaria reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    sourceTextIdx: index("idx_source_text").on(table.sourceText),
    referenceIdx: index("idx_reference").on(table.reference)
  };
});

// AI Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull(), // 'chapter', 'book', 'global'
  contextReference: text("context_reference"), // Current context (book/chapter)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  references: jsonb("references"), // Array of text references used
  metadata: jsonb("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audio cache table
export const audioCache = pgTable("audio_cache", {
  id: serial("id").primaryKey(),
  textHash: text("text_hash").notNull().unique(),
  text: text("text").notNull(),
  language: text("language").notNull(),
  voiceId: text("voice_id").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"), // Duration in seconds
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
}, (table) => {
  return {
    textHashIdx: index("idx_text_hash").on(table.textHash),
    languageIdx: index("idx_language").on(table.language)
  };
});

// Relations
export const booksRelations = relations(books, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Zod schemas for validation
export const insertBookSchema = createInsertSchema(books);
export const selectBookSchema = createSelectSchema(books);

export const insertChapterSchema = createInsertSchema(chapters);
export const selectChapterSchema = createSelectSchema(chapters);

export const insertTranslationSchema = createInsertSchema(translations);
export const selectTranslationSchema = createSelectSchema(translations);

export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);

export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export const insertAudioCacheSchema = createInsertSchema(audioCache);
export const selectAudioCacheSchema = createSelectSchema(audioCache);

// Types
export type Book = z.infer<typeof selectBookSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Chapter = z.infer<typeof selectChapterSchema>;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Translation = z.infer<typeof selectTranslationSchema>;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type Conversation = z.infer<typeof selectConversationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = z.infer<typeof selectMessageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type AudioCache = z.infer<typeof selectAudioCacheSchema>;
export type InsertAudioCache = z.infer<typeof insertAudioCacheSchema>;