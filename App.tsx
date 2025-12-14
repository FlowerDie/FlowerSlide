import React, { useState, useEffect } from 'react';
import { ConfigForm } from './components/ConfigForm';
import { SlideViewer } from './components/SlideViewer';
import { generatePresentationContent } from './services/geminiService';
import { GenerationConfig, Presentation } from './types';
import { AlertCircle, Moon, Sun } from 'lucide-react';
import { PRESENTATION_THEMES } from './utils/themes';

export default function App() {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentThemeId, setCurrentThemeId] = useState<string>(PRESENTATION_THEMES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference on initial load
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Update html class and localStorage
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleGenerate = async (config: GenerationConfig) => {
    setIsLoading(true);
    setError(null);
    setCurrentThemeId(config.themeId);
    
    try {
      const result = await generatePresentationContent(
        config.topic,
        config.slideCount,
        config.detailLevel,
        config.sourceText,
        config.includeImages
      );
      setPresentation(result);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации. Проверьте API ключ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = (newPresentation: Presentation) => {
    setPresentation(newPresentation);
  };

  const handleReset = () => {
    setPresentation(null);
    setError(null);
  };

  if (presentation) {
    return (
      <SlideViewer 
        presentation={presentation} 
        onReset={handleReset} 
        onUpdate={handleUpdate}
        themeId={currentThemeId}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] transition-colors duration-300">
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-yellow-400 rounded-full shadow-md hover:shadow-lg transition-all"
        title={darkMode ? "Светлая тема" : "Тёмная тема"}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        
        {error && (
          <div className="w-full max-w-2xl mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">Ошибка</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        <ConfigForm onGenerate={handleGenerate} isLoading={isLoading} />
        
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Powered by Google Gemini 2.5 Flash</p>
        </div>
      </main>
    </div>
  );
}