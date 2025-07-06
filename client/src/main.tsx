import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChayeiMoharanDedicated } from './components/ChayeiMoharanDedicated';
import './index.css';

console.log('🕊️ Chayei Moharan - Initialisation...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChayeiMoharanDedicated />
  </React.StrictMode>
);

console.log('✅ Application Chayei Moharan chargée');