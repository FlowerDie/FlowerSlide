import { Theme } from "../types";

export const PRESENTATION_THEMES: Theme[] = [
  {
    id: 'modern-slate',
    name: 'Modern Slate',
    colors: {
      bg: 'bg-slate-900',
      text: 'text-slate-50',
      accent: 'bg-indigo-500',
      secondary: 'text-slate-400',
      hex: { bg: '0f172a', text: 'f8fafc', accent: '6366f1', secondary: '94a3b8' }
    }
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    colors: {
      bg: 'bg-white',
      text: 'text-gray-900',
      accent: 'bg-blue-600',
      secondary: 'text-gray-500',
      hex: { bg: 'ffffff', text: '111827', accent: '2563eb', secondary: '6b7280' }
    }
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    colors: {
      bg: 'bg-purple-950',
      text: 'text-purple-50',
      accent: 'bg-pink-500',
      secondary: 'text-purple-300',
      hex: { bg: '3b0764', text: 'faf5ff', accent: 'ec4899', secondary: 'd8b4fe' }
    }
  },
  {
    id: 'forest-calm',
    name: 'Forest Calm',
    colors: {
      bg: 'bg-stone-100',
      text: 'text-stone-800',
      accent: 'bg-emerald-600',
      secondary: 'text-stone-600',
      hex: { bg: 'f5f5f4', text: '292524', accent: '059669', secondary: '57534e' }
    }
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    colors: {
      bg: 'bg-blue-900',
      text: 'text-white',
      accent: 'bg-amber-400',
      secondary: 'text-blue-200',
      hex: { bg: '1e3a8a', text: 'ffffff', accent: 'fbbf24', secondary: 'bfdbfe' }
    }
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    colors: {
      bg: 'bg-orange-50',
      text: 'text-gray-900',
      accent: 'bg-orange-500',
      secondary: 'text-gray-600',
      hex: { bg: 'fff7ed', text: '111827', accent: 'f97316', secondary: '4b5563' }
    }
  }
];