import React, { useState, useEffect } from 'react';
import { ChayeiMoharanViewer } from './components/ChayeiMoharanViewer';
import './index.css';

export default function ChayeiMoharanApp() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <ChayeiMoharanViewer />
    </div>
  );
}