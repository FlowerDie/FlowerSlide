export enum DetailLevel {
  BRIEF = 'Brief',
  MODERATE = 'Moderate',
  DETAILED = 'Detailed'
}

export interface ThemeColors {
  bg: string;        // Tailwind class for background
  text: string;      // Tailwind class for text
  accent: string;    // Tailwind class for accents (bullets, lines)
  secondary: string; // Tailwind class for secondary text
  hex: {             // Hex codes for PPTX generation
    bg: string;
    text: string;
    accent: string;
    secondary: string;
  }
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export interface Slide {
  title: string;
  content: string[];
  imageKeyword: string; // Used to seed a placeholder image
  speakerNotes?: string;
}

export interface Presentation {
  mainTitle: string;
  subTitle?: string;
  slides: Slide[];
  includeImages: boolean; // Persist this setting
}

export interface GenerationConfig {
  topic: string;
  slideCount: number;
  detailLevel: DetailLevel;
  sourceText: string;
  isCustomSource: boolean;
  themeId: string;
  includeImages: boolean;
}