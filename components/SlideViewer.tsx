import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, FileJson, FileText, Maximize2, Monitor, Printer, RefreshCw, X, MessageCircle, Send, Sparkles, Image as ImageIcon, Upload } from 'lucide-react';
import { Presentation } from '../types';
import { PRESENTATION_THEMES } from '../utils/themes';
import { downloadPPTX } from '../utils/pptxGenerator';
import { updatePresentation } from '../services/geminiService';

// --- Editable Text Component ---
interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  tagName?: 'h1' | 'h2' | 'p' | 'span';
}

const EditableText: React.FC<EditableTextProps> = ({ value, onChange, className = '', multiline = false, tagName = 'span' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
    // Stop propagation to prevent slide navigation while editing
    e.stopPropagation();
  };

  if (isEditing) {
    const commonClasses = `bg-white/10 backdrop-blur-sm rounded outline-none border-2 border-indigo-500/50 w-full text-inherit ${className}`;
    
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${commonClasses} resize-none min-h-[1.5em]`}
          style={{ height: 'auto' }}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      />
    );
  }

  // Render static element based on tagName, with a hover effect to indicate editability
  const Tag = tagName as any;
  return (
    <Tag 
      onClick={() => setIsEditing(true)} 
      className={`cursor-text hover:bg-black/5 hover:rounded px-1 -mx-1 transition-colors border border-transparent hover:border-black/10 ${className}`}
      title="Нажмите, чтобы редактировать"
    >
      {value}
    </Tag>
  );
};


// --- Main SlideViewer Component ---

interface SlideViewerProps {
  presentation: Presentation;
  onReset: () => void;
  onUpdate: (newPresentation: Presentation) => void;
  themeId: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ presentation, onReset, onUpdate, themeId }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Custom Background State
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Slide Images State (Key: Slide Index 0-based from slides array, Value: Base64 string)
  const [customSlideImages, setCustomSlideImages] = useState<{[key: number]: string}>({});
  const slideImageInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Привет! Я могу изменить презентацию. Напиши, что исправить или добавить.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Store custom seeds for images so user can refresh them
  const [imageSeeds, setImageSeeds] = useState<{[key: number]: string}>({});

  const theme = PRESENTATION_THEMES.find(t => t.id === themeId) || PRESENTATION_THEMES[0];

  // Reset to cover when presentation changes completely (not updates)
  useEffect(() => {
    if (currentSlideIndex > presentation.slides.length) {
      setCurrentSlideIndex(0);
    }
  }, [presentation.slides.length]);

  const nextSlide = () => {
    if (currentSlideIndex < presentation.slides.length) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if we are editing an input/textarea currently
    const activeTag = document.activeElement?.tagName.toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || isChatOpen) return;

    if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') setIsFullscreen(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, isChatOpen]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Determine content to show based on index
  const isCover = currentSlideIndex === 0;
  const slideData = !isCover ? presentation.slides[currentSlideIndex - 1] : null;
  const totalSlides = presentation.slides.length + 1; // +1 for cover

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleDownloadPPTX = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    await downloadPPTX(presentation, theme, imageSeeds, customBackground, customSlideImages);
    setIsExporting(false);
  };

  const handleDownloadPDF = () => {
    setShowExportMenu(false);
    setTimeout(() => window.print(), 100);
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presentation, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", presentation.mainTitle + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowExportMenu(false);
  };

  const refreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!slideData) return;
    const slideIdx = currentSlideIndex - 1;
    // Clear custom image if it exists when refreshing
    if (customSlideImages[slideIdx]) {
       const newImages = {...customSlideImages};
       delete newImages[slideIdx];
       setCustomSlideImages(newImages);
    }
    const newSeed = `${slideData.imageKeyword}-${Math.random().toString(36).substring(7)}`;
    setImageSeeds(prev => ({ ...prev, [slideIdx]: newSeed }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isUpdating) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsUpdating(true);

    try {
      const updatedPresentation = await updatePresentation(presentation, userMsg);
      onUpdate(updatedPresentation);
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Готово! Я обновил презентацию.' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Извините, произошла ошибка при обновлении. Попробуйте еще раз.' }]);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Background Upload Handlers ---
  const triggerBackgroundUpload = () => {
    fileInputRef.current?.click();
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomBackground(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCustomBackground = () => {
    setCustomBackground(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Slide Image Upload Handlers ---
  const triggerSlideImageUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    slideImageInputRef.current?.click();
  };

  const handleSlideImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && slideData) {
      const slideIdx = currentSlideIndex - 1;
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomSlideImages(prev => ({
          ...prev,
          [slideIdx]: event.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
    // Reset value to allow re-uploading same file
    if (slideImageInputRef.current) slideImageInputRef.current.value = '';
  };

  // --- Manual Edit Handlers ---
  const updateMainTitle = (newVal: string) => {
    onUpdate({ ...presentation, mainTitle: newVal });
  };
  
  const updateSubTitle = (newVal: string) => {
    onUpdate({ ...presentation, subTitle: newVal });
  };

  const updateSlideTitle = (newVal: string) => {
    if (!slideData) return;
    const newSlides = [...presentation.slides];
    newSlides[currentSlideIndex - 1] = { ...slideData, title: newVal };
    onUpdate({ ...presentation, slides: newSlides });
  };

  const updateSlideContent = (index: number, newVal: string) => {
    if (!slideData) return;
    const newSlides = [...presentation.slides];
    const newContent = [...slideData.content];
    newContent[index] = newVal;
    newSlides[currentSlideIndex - 1] = { ...slideData, content: newContent };
    onUpdate({ ...presentation, slides: newSlides });
  };

  const updateSpeakerNotes = (newVal: string) => {
    if (!slideData) return;
    const newSlides = [...presentation.slides];
    newSlides[currentSlideIndex - 1] = { ...slideData, speakerNotes: newVal };
    onUpdate({ ...presentation, slides: newSlides });
  };

  return (
    <>
      <div className={`flex flex-col h-screen max-h-screen bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} print:hidden`}>
        
        {/* Toolbar */}
        <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onReset}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
              title="Назад к настройкам"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm md:text-base truncate max-w-xs md:max-w-md">
                {presentation.mainTitle}
              </h2>
              <span className="text-xs text-gray-400">
                Слайд {currentSlideIndex + 1} из {totalSlides}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
             {/* Background Upload Button */}
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleBackgroundChange}
              />
              <button 
                onClick={customBackground ? clearCustomBackground : triggerBackgroundUpload}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  customBackground ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
                title="Загрузить свой фон"
              >
                {customBackground ? <X className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">{customBackground ? 'Удалить фон' : 'Фон'}</span>
              </button>

            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
              >
                {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">Экспорт</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <button onClick={handleDownloadPPTX} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2 transition-colors">
                    <Monitor className="w-4 h-4 text-orange-500" />
                    PowerPoint (.pptx)
                  </button>
                  <button onClick={handleDownloadPDF} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 transition-colors">
                    <Printer className="w-4 h-4 text-gray-500" />
                    PDF (Печать)
                  </button>
                  <button onClick={handleDownloadJSON} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 transition-colors">
                    <FileJson className="w-4 h-4 text-green-500" />
                    JSON Data
                  </button>
                </div>
              )}
            </div>

             <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hidden md:block"
              title="На весь экран"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 relative">
          
          {/* Sidebar Thumbnails (Hidden on mobile) */}
          <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto custom-scrollbar transition-colors">
            <div className="p-4 space-y-3">
               {/* Cover Thumb */}
               <div 
                  onClick={() => setCurrentSlideIndex(0)}
                  className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                    currentSlideIndex === 0 ? 'border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`aspect-video ${theme.colors.bg} flex items-center justify-center p-2`}>
                    <span className={`text-[8px] ${theme.colors.text} text-center font-bold`}>{presentation.mainTitle}</span>
                  </div>
                  <div className="text-xs text-center py-1 font-medium text-gray-500 dark:text-gray-400">Обложка</div>
                </div>

               {presentation.slides.map((slide, idx) => (
                 <div 
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx + 1)}
                  className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                    currentSlideIndex === idx + 1 ? 'border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                    {presentation.includeImages && (
                       <img 
                        src={customSlideImages[idx] || `https://picsum.photos/seed/${imageSeeds[idx] || slide.imageKeyword}/160/90?blur=2`} 
                        alt="thumb" 
                        className="w-full h-full object-cover opacity-80"
                        loading="lazy"
                        crossOrigin="anonymous"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center p-1 bg-black/20">
                       <span className="text-[8px] text-white font-bold text-center line-clamp-2 drop-shadow-md">{slide.title}</span>
                    </div>
                  </div>
                  <div className="text-xs text-center py-1 font-medium text-gray-500 dark:text-gray-400">Слайд {idx + 1}</div>
                </div>
               ))}
            </div>
          </div>

          {/* Current Slide Display */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
            
            <div 
              className={`w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden relative flex flex-col transition-colors duration-500 ${theme.colors.bg}`}
              style={customBackground ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {/* Dark overlay if custom background is used to ensure text readability */}
              {customBackground && <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>}
              
              {isCover ? (
                // Cover Slide Design
                <div className="w-full h-full relative flex flex-col justify-center items-center text-center p-12 z-10">
                  {!customBackground && <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>}
                  <div className="z-10 animate-in fade-in zoom-in duration-500 max-w-3xl w-full">
                    <EditableText
                      tagName="h1"
                      value={presentation.mainTitle}
                      onChange={updateMainTitle}
                      className={`text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight drop-shadow-sm ${customBackground ? 'text-white' : theme.colors.text}`}
                      multiline
                    />
                    
                    <div className={`text-xl md:text-2xl font-light ${customBackground ? 'text-gray-200' : theme.colors.accent} opacity-90`}>
                      <EditableText
                         value={presentation.subTitle || ""}
                         onChange={updateSubTitle}
                         tagName="p"
                      />
                    </div>
                    
                    <div className={`mt-12 w-24 h-2 mx-auto rounded-full ${theme.colors.accent}`}></div>
                  </div>
                </div>
              ) : slideData ? (
                // Content Slide Design
                <div className="w-full h-full flex flex-col md:flex-row relative z-10">
                   
                   {/* Slide Image Side */}
                   {presentation.includeImages && (
                     <div className="w-full md:w-1/3 h-48 md:h-full relative overflow-hidden bg-gray-900 group">
                        <img 
                          src={customSlideImages[currentSlideIndex-1] || `https://picsum.photos/seed/${imageSeeds[currentSlideIndex-1] || slideData.imageKeyword}/800/1200`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          alt="slide visual"
                          crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-black/10"></div>
                        
                        {/* Image Controls Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <input 
                              type="file" 
                              ref={slideImageInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleSlideImageChange} 
                           />
                           <button 
                             onClick={triggerSlideImageUpload}
                             className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                             title="Загрузить свое фото"
                           >
                             <Upload className="w-4 h-4" />
                           </button>
                           {!customSlideImages[currentSlideIndex-1] && (
                             <button 
                              onClick={refreshImage}
                              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                              title="Сгенерировать новое"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                           )}
                           {customSlideImages[currentSlideIndex-1] && (
                             <button 
                              onClick={refreshImage}
                              className="p-2 bg-red-500/70 hover:bg-red-500/90 rounded-full text-white"
                              title="Сбросить фото"
                            >
                              <X className="w-4 h-4" />
                            </button>
                           )}
                        </div>
                     </div>
                   )}
                   
                   {/* Slide Content Side */}
                   <div className={`flex-1 p-6 md:p-8 lg:p-10 flex flex-col bg-opacity-50 relative overflow-hidden`}>
                     
                     {/* Header Area */}
                     <div className="flex-shrink-0 mb-4 border-b-2 border-opacity-30 pb-2 border-gray-500">
                       <div className={`absolute top-6 right-8 text-6xl font-bold opacity-10 select-none ${customBackground ? 'text-white' : theme.colors.text}`}>
                         {currentSlideIndex}
                       </div>

                       <div className={`text-2xl md:text-3xl lg:text-4xl font-bold z-10 relative pr-16 leading-tight ${customBackground ? 'text-white' : theme.colors.accent}`}>
                          <EditableText 
                            value={slideData.title}
                            onChange={updateSlideTitle}
                            tagName="h2"
                            multiline
                          />
                       </div>
                     </div>
                     
                     {/* Content Area - Fixed height, no scroll as requested */}
                     <div className="flex-grow overflow-hidden pr-2 flex flex-col justify-center">
                       <ul className="space-y-3 md:space-y-4">
                         {slideData.content.map((point, i) => (
                           <li key={i} className={`flex items-start text-base md:text-lg lg:text-xl ${customBackground ? 'text-white' : theme.colors.text}`}>
                             <span className={`mr-4 mt-2.5 w-2 h-2 rounded-full flex-shrink-0 ${theme.colors.accent}`}></span>
                             <div className="flex-1 font-light leading-relaxed">
                               <EditableText
                                 value={point}
                                 onChange={(val) => updateSlideContent(i, val)}
                                 multiline
                               />
                             </div>
                           </li>
                         ))}
                       </ul>
                     </div>

                   </div>
                </div>
              ) : null}

            </div>

            {/* Navigation Overlay Buttons (Mobile friendly) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                disabled={currentSlideIndex === 0}
                className={`p-3 rounded-full bg-black/50 text-white pointer-events-auto hover:bg-black/70 transition-all ${currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100'}`}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                disabled={currentSlideIndex === totalSlides - 1}
                className={`p-3 rounded-full bg-black/50 text-white pointer-events-auto hover:bg-black/70 transition-all ${currentSlideIndex === totalSlides - 1 ? 'opacity-0' : 'opacity-100'}`}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Speaker Notes Area (Bottom) */}
        {!isCover && slideData?.speakerNotes && (
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 h-24 overflow-y-auto transition-colors">
            <div className="max-w-4xl mx-auto">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-wider block mb-1">Заметки докладчика:</span>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <EditableText 
                  value={slideData.speakerNotes}
                  onChange={updateSpeakerNotes}
                  multiline
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Assistant Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-40 transition-all transform hover:scale-105 ${
            isChatOpen ? 'bg-red-500 rotate-90' : 'bg-indigo-600 dark:bg-indigo-700'
          } text-white`}
        >
           {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>

        {/* AI Chat Sidebar */}
        {isChatOpen && (
          <div className="fixed right-6 bottom-24 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-300 h-[500px] max-h-[70vh]">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-700 dark:to-violet-700 p-4 text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI Ассистент</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
               {chatMessages.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                     msg.role === 'user' 
                     ? 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-br-none' 
                     : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               {isUpdating && (
                 <div className="flex justify-start">
                   <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                     <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                     <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                   </div>
                 </div>
               )}
               <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Добавь слайд о..."
                disabled={isUpdating}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isUpdating}
                className="p-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Hidden Print Container */}
      <div id="print-container" className="hidden">
        {/* Cover */}
        <div className={`print-slide ${theme.colors.bg} flex flex-col items-center justify-center text-center p-12`}>
           <h1 className={`text-6xl font-bold mb-8 ${theme.colors.text}`}>{presentation.mainTitle}</h1>
           {presentation.subTitle && <p className={`text-3xl ${theme.colors.accent}`}>{presentation.subTitle}</p>}
        </div>
        {/* Slides */}
        {presentation.slides.map((slide, idx) => (
           <div key={idx} className={`print-slide flex flex-row ${theme.colors.bg}`}>
             {presentation.includeImages && (
               <div className="w-1/3 h-full overflow-hidden">
                  <img 
                    src={customSlideImages[idx] || `https://picsum.photos/seed/${imageSeeds[idx] || slide.imageKeyword}/800/1200`} 
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
               </div>
             )}
             <div className={`flex-1 p-16 ${theme.colors.bg}`}>
               <h2 className={`text-4xl font-bold mb-12 border-b-4 pb-4 ${theme.colors.accent}`}>{slide.title}</h2>
               <ul className="space-y-6">
                 {slide.content.map((p, i) => (
                   <li key={i} className={`text-2xl ${theme.colors.text}`}>• {p}</li>
                 ))}
               </ul>
             </div>
           </div>
        ))}
      </div>
    </>
  );
};