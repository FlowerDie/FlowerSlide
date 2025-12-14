import React, { useState } from 'react';
import { BookOpen, Brain, FileText, Image as ImageIcon, Layers, MessageSquare, Palette, Sparkles } from 'lucide-react';
import { DetailLevel, GenerationConfig } from '../types';
import { PRESENTATION_THEMES } from '../utils/themes';

interface ConfigFormProps {
  onGenerate: (config: GenerationConfig) => void;
  isLoading: boolean;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ onGenerate, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(DetailLevel.MODERATE);
  const [isCustomSource, setIsCustomSource] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState(PRESENTATION_THEMES[0].id);
  const [includeImages, setIncludeImages] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      topic,
      slideCount,
      detailLevel,
      isCustomSource,
      sourceText: isCustomSource ? sourceText : '',
      themeId: selectedThemeId,
      includeImages
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-12 transition-colors duration-300">
      <div className="bg-indigo-600 dark:bg-indigo-700 p-6 text-center transition-colors">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8" />
          FlowerSlide AI
        </h1>
        <p className="text-indigo-100 mt-2">
          Создавайте профессиональные презентации за секунды
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Тема презентации
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: История освоения космоса"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Source Toggle */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Источник информации</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIsCustomSource(false)}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 border transition-all ${
                !isCustomSource 
                  ? 'bg-white dark:bg-gray-800 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500' 
                  : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Brain className="w-4 h-4" />
              Знания ИИ
            </button>
            <button
              type="button"
              onClick={() => setIsCustomSource(true)}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 border transition-all ${
                isCustomSource 
                  ? 'bg-white dark:bg-gray-800 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500' 
                  : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Мой текст
            </button>
          </div>

          {isCustomSource && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Вставьте текст, на основе которого нужно создать слайды..."
                className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required={isCustomSource}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {sourceText.length} символов
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slide Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Количество слайдов: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{slideCount}</span>
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>3</span>
              <span>15</span>
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Детализация (слов на слайде)
            </label>
            <select
              value={detailLevel}
              onChange={(e) => setDetailLevel(e.target.value as DetailLevel)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={DetailLevel.BRIEF}>Кратко (Тезисы)</option>
              <option value={DetailLevel.MODERATE}>Средне (Стандарт)</option>
              <option value={DetailLevel.DETAILED}>Подробно (Лекция)</option>
            </select>
          </div>
        </div>
        
        {/* Images Toggle */}
        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 transition-colors">
          <input
            type="checkbox"
            id="includeImages"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
          <label htmlFor="includeImages" className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2 cursor-pointer select-none">
            <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Добавлять изображения на слайды
          </label>
        </div>

        {/* Theme Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Стиль презентации
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESENTATION_THEMES.map((theme) => (
              <div
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`cursor-pointer rounded-lg border-2 p-3 flex items-center gap-3 transition-all ${
                  selectedThemeId === theme.id 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-600' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border shadow-sm ${theme.colors.bg}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{theme.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || (!topic && !isCustomSource)}
          className={`w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Создать презентацию
            </>
          )}
        </button>
      </form>
    </div>
  );
};