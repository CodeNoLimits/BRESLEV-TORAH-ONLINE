import React from 'react';
import ReactDOM from 'react-dom/client';
import ChayeiMoharanApp from './components/ChayeiMoharanApp';
import './index.css';

// Vérification des API nécessaires
const checkBrowserSupport = () => {
  const warnings = [];
  
  if (!('speechSynthesis' in window)) {
    warnings.push('Text-to-Speech non supporté dans ce navigateur');
  }
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    warnings.push('Reconnaissance vocale non supportée dans ce navigateur');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Limitations navigateur:', warnings);
  } else {
    console.log('✅ Toutes les API vocales sont supportées');
  }
};

// Initialisation de l'application
const initializeApp = () => {
  checkBrowserSupport();
  
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  root.render(
    <React.StrictMode>
      <ChayeiMoharanApp />
    </React.StrictMode>
  );
  
  console.log('🕊️ Application Chayei Moharan initialisée');
};

// Charger les voix TTS si disponibles
if ('speechSynthesis' in window) {
  // Attendre que les voix soient chargées
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      console.log('🔊 Voix TTS chargées:', speechSynthesis.getVoices().length);
      initializeApp();
    }, { once: true });
  } else {
    initializeApp();
  }
} else {
  initializeApp();
}