import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { AppError } from '../middleware/errorHandler.js';
import { db, audioCache } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Voice configurations
const VOICE_CONFIG = {
  he: { languageCode: 'he-IL', name: 'he-IL-Studio-B', ssmlGender: 'MALE' as const },
  en: { languageCode: 'en-US', name: 'en-US-Studio-O', ssmlGender: 'MALE' as const },
  fr: { languageCode: 'fr-FR', name: 'fr-FR-Studio-D', ssmlGender: 'MALE' as const }
};

// Audio configuration
const AUDIO_CONFIG = {
  audioEncoding: 'MP3' as const,
  speakingRate: 0.9,
  pitch: 0,
  volumeGainDb: 0
};

interface TTSRequest {
  text: string;
  language: 'he' | 'en' | 'fr';
  voiceId?: string;
}

export class TTSService {
  private static instance: TTSService;
  private client: TextToSpeechClient;
  private audioDir: string;
  
  private constructor() {
    // Parse credentials from environment
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not defined');
    }

    try {
      const credentials = JSON.parse(credentialsJson);
      this.client = new TextToSpeechClient({ credentials });
    } catch (error) {
      console.error('Failed to parse Google credentials:', error);
      throw new Error('Invalid Google Cloud credentials');
    }

    // Setup audio directory
    this.audioDir = path.join(__dirname, '../../../public/audio');
  }
  
  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Convert text to speech
   */
  async synthesizeSpeech({ text, language, voiceId }: TTSRequest) {
    try {
      // Clean text for TTS
      const cleanedText = this.cleanTextForTTS(text);
      const textHash = this.hashText(cleanedText + language);

      // Check cache first
      const cached = await db.query.audioCache.findFirst({
        where: eq(audioCache.textHash, textHash)
      });

      if (cached) {
        // Update last accessed time
        await db.update(audioCache)
          .set({ lastAccessedAt: new Date() })
          .where(eq(audioCache.id, cached.id));
        
        return {
          audioUrl: cached.audioUrl,
          fromCache: true,
          duration: cached.duration
        };
      }

      // Get voice configuration
      const voice = voiceId ? 
        { ...VOICE_CONFIG[language], name: voiceId } : 
        VOICE_CONFIG[language];

      // Prepare the request
      const request = {
        input: { text: cleanedText },
        voice,
        audioConfig: AUDIO_CONFIG
      };

      // Perform the text-to-speech request
      const [response] = await this.client.synthesizeSpeech(request as any);
      
      if (!response.audioContent) {
        throw new AppError('No audio content received from TTS', 500);
      }

      // Ensure audio directory exists
      await fs.mkdir(this.audioDir, { recursive: true });

      // Save audio file
      const filename = `${textHash}.mp3`;
      const filePath = path.join(this.audioDir, filename);
      await fs.writeFile(filePath, response.audioContent, 'binary');

      // Generate URL (relative to public directory)
      const audioUrl = `/audio/${filename}`;

      // Cache the result
      await db.insert(audioCache).values({
        textHash,
        text: cleanedText,
        language,
        voiceId: voice.name,
        audioUrl,
        metadata: { voice, originalLength: text.length }
      });

      return {
        audioUrl,
        fromCache: false
      };
    } catch (error) {
      console.error('TTS error:', error);
      throw new AppError('Erreur de synthèse vocale. Veuillez réessayer.', 500);
    }
  }

  /**
   * List available voices for a language
   */
  async listVoices(languageCode?: string) {
    try {
      const [response] = await this.client.listVoices({ languageCode });
      
      return response.voices?.map(voice => ({
        name: voice.name,
        languageCodes: voice.languageCodes,
        ssmlGender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz
      })) || [];
    } catch (error) {
      console.error('Error listing voices:', error);
      throw new AppError('Impossible de récupérer la liste des voix', 500);
    }
  }

  /**
   * Clean text for TTS processing
   */
  private cleanTextForTTS(text: string): string {
    let cleaned = text;
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/[\*`_~#]/g, '');
    
    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    
    // Trim
    cleaned = cleaned.trim();
    
    // Limit length (Google TTS has a 5000 character limit)
    if (cleaned.length > 5000) {
      cleaned = cleaned.substring(0, 4997) + '...';
    }
    
    return cleaned;
  }

  /**
   * Hash text for caching
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Clean up old cached audio files
   */
  async cleanupOldAudio(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Get old cache entries
      const { lt } = await import('drizzle-orm');
      const oldEntries = await db.query.audioCache.findMany({
        where: lt(audioCache.lastAccessedAt, cutoffDate)
      });

      // Delete files and database entries
      for (const entry of oldEntries) {
        const filename = entry.audioUrl.split('/').pop();
        if (filename) {
          const filePath = path.join(this.audioDir, filename);
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.error(`Failed to delete audio file: ${filePath}`, error);
          }
        }
      }

      // Delete from database
      if (oldEntries.length > 0) {
        const { lt } = await import('drizzle-orm');
        await db.delete(audioCache)
          .where(lt(audioCache.lastAccessedAt, cutoffDate));
      }

      return {
        cleaned: oldEntries.length,
        cutoffDate
      };
    } catch (error) {
      console.error('Error cleaning up audio:', error);
      throw new AppError('Erreur lors du nettoyage des fichiers audio', 500);
    }
  }
}