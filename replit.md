# Le Compagnon du Cœur - Replit Guide

## Overview

Le Compagnon du Cœur is a sophisticated spiritual guidance web application that serves as an interactive study companion for the teachings of Rabbi Nahman of Breslov. The application combines a comprehensive digital library of Breslov texts with AI-powered analysis and guidance features to create an immersive spiritual learning experience.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component architecture
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom spiritual theme using dark palette (slate, sky, amber colors)
- **UI Components**: Custom component library built with Radix UI primitives
- **State Management**: React hooks and context for local state management
- **Client-side Routing**: Single-page application with component-based navigation

### Backend Architecture
- **Server**: Express.js with TypeScript for API endpoints
- **Runtime**: Node.js with ES modules
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot module replacement via Vite middleware integration

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle migrations for version control
- **Connection**: Neon Database serverless PostgreSQL instance
- **Local Storage**: Browser sessionStorage for caching Sefaria API responses

## Key Components

### 1. Library System (Sefaria Integration)
- **Dynamic Content Fetching**: Real-time connection to Sefaria public API
- **Hierarchical Navigation**: Recursive tree structure for browsing Breslov texts
- **Content Filtering**: Automatic extraction of Chasidut > Breslov category
- **Caching Strategy**: Client-side caching with 24-hour TTL for performance
- **Multi-language Support**: Hebrew and English text display

### 2. AI Companion (Gemini Integration)
- **AI Engine**: Google Gemini 1.5-flash model for content generation
- **Streaming Responses**: Real-time response delivery for better UX
- **Multiple Analysis Modes**:
  - Study Mode: Deep textual analysis of selected teachings
  - Exploration Mode: General spiritual guidance conversations
  - Analysis Mode: Focused examination of user-provided text excerpts
  - Counsel Mode: Personal spiritual guidance based on user situations
  - Summary Mode: Key points extraction from lengthy responses

### 3. Accessibility Features
- **Text-to-Speech**: Multi-language voice synthesis (French, English, Hebrew)
- **Voice Input**: Web Speech API integration for hands-free interaction
- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Keyboard Navigation**: Full accessibility compliance

### 4. User Interface Components
- **Header**: Language selector, TTS controls, navigation toggle
- **Sidebar**: Collapsible library browser with accordion-style navigation
- **Chat Area**: Streaming conversation interface with message history
- **Input Area**: Multi-mode input system with tabbed interface
- **Text Viewer**: Dedicated display for selected spiritual texts

## Data Flow

### 1. Library Browsing Flow
1. Application fetches Sefaria index on initial load
2. Breslov category is extracted and cached locally
3. User navigates hierarchical tree structure
4. Text selection triggers automatic AI analysis
5. Full text content is fetched and displayed

### 2. AI Interaction Flow
1. User input is classified by interaction mode
2. Appropriate prompt formatting is applied
3. Gemini API request is initiated with streaming
4. Response chunks are processed and displayed in real-time
5. TTS automatically reads response if enabled

### 3. Voice Interaction Flow
1. User activates voice input via microphone button
2. Web Speech API captures and transcribes audio
3. Transcribed text follows standard AI interaction flow
4. Response is both displayed and spoken via TTS

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM for UI framework
- **Build Tools**: Vite, TypeScript, PostCSS for development pipeline
- **Styling**: Tailwind CSS, class-variance-authority for design system
- **UI Primitives**: Radix UI components for accessible base components
- **AI Integration**: @google/genai for Gemini API access
- **Database**: Drizzle ORM, @neondatabase/serverless for data persistence

### API Integrations
- **Sefaria API**: Public REST API for Jewish text library access
- **Google Gemini API**: AI language model for content generation
- **Web Speech API**: Browser-native speech recognition and synthesis

### Development Dependencies
- **TypeScript**: Type checking and development experience
- **ESBuild**: Fast bundling for production builds
- **TSX**: TypeScript execution for development server

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Local PostgreSQL or Neon Database connection
- **Environment Variables**: `.env` file for API keys and database URL

### Production Build
- **Client Build**: Vite builds optimized static assets to `dist/public`
- **Server Build**: ESBuild bundles Express server to `dist/index.js`
- **Static Assets**: Vite handles asset optimization and fingerprinting

### Deployment Targets
- **Replit**: Configured for seamless deployment with provided scripts
- **Static Hosting**: Client can be deployed as static site (Netlify, Vercel)
- **Full-Stack Hosting**: Complete application deployment with database

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL`
- **AI Service**: Gemini API key via environment variables
- **Build Settings**: NODE_ENV determines development vs production behavior

## Changelog

- June 29, 2025: Initial setup
- June 29, 2025: Database added with PostgreSQL support and comprehensive schema
- June 29, 2025: Sefaria API v3 integration completed with exhaustive Breslov text discovery
- June 29, 2025: Universal CORS proxy implemented for seamless API access
- June 29, 2025: Complete library system operational with 14+ Breslov references and 5 categories

## Recent Changes

- ✓ Implemented Express proxy server with dedicated Sefaria API routes (/api/sefaria/texts/* and /api/sefaria/breslov-index)
- ✓ Replaced all direct API calls to sefaria.org with proxy routes to eliminate CORS issues
- ✓ Built robust Breslov library with 9 authenticated books using validated Sefaria references
- ✓ Configured text fetching to extract authentic Hebrew and English content from Sefaria versions
- ✓ Verified proxy functionality with curl tests showing real Breslov text retrieval
- ✓ Updated SefariaService to use proxy-based architecture with proper caching

## User Preferences

Preferred communication style: Simple, everyday language.