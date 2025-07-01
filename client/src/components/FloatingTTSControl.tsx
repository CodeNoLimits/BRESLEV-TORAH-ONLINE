import React, { useState, useCallback } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

interface FloatingTTSControlProps {
  isSpeaking: boolean;
  isListening: boolean;
  onToggleTTS: () => void;
  onStartListening: () => void;
  onSpeak?: (text: string) => void;
}

export const FloatingTTSControl: React.FC<FloatingTTSControlProps> = ({
  isSpeaking,
  isListening,
  onToggleTTS,
  onStartListening,
  onSpeak,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const startVoiceInput = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.lang = 'fr-FR';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

    recognitionInstance.onstart = () => {
      setIsRecording(true);
      console.log('[Voice] Recording started');
    };

    recognitionInstance.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('[Voice] Transcript:', transcript);

      // Send to AI for response
      try {
        const response = await fetch('/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: `Question en français: "${transcript}". Réponds en français selon les enseignements de Rabbi Nahman de Breslov.`
          })
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          let aiResponse = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              aiResponse += new TextDecoder().decode(value);
            }
          }

          // Speak the AI response in French
          if (onSpeak && aiResponse) {
            onSpeak(aiResponse);
          }
        }
      } catch (error) {
        console.error('[Voice] AI response error:', error);
        if (onSpeak) {
          onSpeak('Désolé, je n\'ai pas pu traiter votre question. Veuillez réessayer.');
        }
      }
    };

    recognitionInstance.onend = () => {
      setIsRecording(false);
      console.log('[Voice] Recording ended');
    };

    recognitionInstance.onerror = (event: any) => {
      setIsRecording(false);
      console.error('[Voice] Recognition error:', event.error);
    };

    setRecognition(recognitionInstance);
    recognitionInstance.start();
  }, [onSpeak]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  }, [recognition]);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      <button
        onClick={onToggleTTS}
        className={`p-3 rounded-full shadow-xl transition-all duration-200 border-2 ${
          isSpeaking
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-300'
            : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-300'
        }`}
        title={isSpeaking ? 'Arrêter la lecture' : 'Activer la lecture audio'}
      >
        {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>

      <button
        onClick={isRecording ? stopRecording : startVoiceInput}
        className={`p-3 rounded-full shadow-xl transition-all duration-200 border-2 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-300'
            : 'bg-green-500 hover:bg-green-600 text-white border-green-300'
        }`}
        title={isRecording ? 'Arrêter l\'enregistrement' : 'Poser une question vocale'}
      >
        {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
    </div>
  );
};