import PptxGenJS from "pptxgenjs";
import { Presentation, Theme } from "../types";

// Helper to sanitize text: ensure first letter is capitalized and string is clean
const sanitizeText = (text: string): string => {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// Helper to fetch image and convert to base64 with timeout
const getBase64FromUrl = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Basic validation to ensure it's a real image data URI
        if (result && result.startsWith('data:image')) {
          resolve(result);
        } else {
          resolve("");
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to fetch image for PPTX (timeout or error):", url);
    return "";
  }
};

export const downloadPPTX = async (
  presentation: Presentation, 
  theme: Theme, 
  imageSeeds: {[key: number]: string},
  backgroundImage?: string | null,
  customSlideImages: {[key: number]: string} = {}
) => {
  const pres = new PptxGenJS();
  
  // Set Metadata
  pres.title = presentation.mainTitle;
  pres.author = "FlowerSlide AI";
  
  // Define Master Slide settings
  const masterBackground = backgroundImage 
    ? { data: backgroundImage } // Use custom image if provided
    : { color: theme.colors.hex.bg }; // Fallback to theme color

  // Define Master Slide based on Theme
  pres.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: masterBackground,
    slideNumber: { 
      x: "95%", 
      y: "92%", 
      color: theme.colors.hex.secondary, 
      fontSize: 12, 
      fontFace: "Arial" 
    },
    objects: [
      // Decor element (bottom bar) - only show if no custom background to avoid clutter
      // Casting percentage strings to any to bypass strict Coord type checking (expecting number)
      ...(backgroundImage ? [] : [{ rect: { x: 0, y: "95%" as any, w: "100%" as any, h: "5%" as any, fill: { color: theme.colors.hex.accent } } }])
    ]
  });

  // 1. Cover Slide (Use Master to get background, but hide number if desired, though here we keep it consistent)
  const cover = pres.addSlide({ masterName: "MASTER_SLIDE" });
  
  cover.addText(sanitizeText(presentation.mainTitle), {
    x: "5%", y: "30%", w: "90%", h: "25%",
    fontSize: 44,
    bold: true,
    align: "center",
    color: theme.colors.hex.text,
    fontFace: "Arial", // Force Arial for Cyrillic safety
    shrinkText: true // Fit text to box
  });

  if (presentation.subTitle) {
    cover.addText(sanitizeText(presentation.subTitle), {
      x: "10%", y: "55%", w: "80%", h: "15%",
      fontSize: 24,
      align: "center",
      color: theme.colors.hex.accent,
      fontFace: "Arial",
      shrinkText: true
    });
  }

  // 2. Content Slides
  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    const pptxSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
    
    // Title
    pptxSlide.addText(sanitizeText(slide.title), {
      x: "5%", y: "5%", w: "90%", h: "15%",
      fontSize: 32,
      bold: true,
      color: theme.colors.hex.accent,
      fontFace: "Arial",
      shrinkText: true
    });

    // Add underline line manually
    pptxSlide.addShape("line", {
      x: "5%", y: "21%", w: "90%", h: 0,
      line: { color: theme.colors.hex.accent, width: 2 }
    });

    const hasImage = presentation.includeImages;
    const contentWidth = hasImage ? "50%" : "90%";

    // Content (Left side text)
    // To separate bullets visually, we add spacing after paragraphs
    const bulletText = slide.content.map(point => ({ 
      text: sanitizeText(point), 
      options: { 
        breakLine: true, 
        indentLevel: 0,
        paraSpaceAfter: 10 // Space between bullets
      } 
    }));

    pptxSlide.addText(bulletText, {
      x: "5%", y: "25%", w: contentWidth, h: "65%",
      fontSize: 18,
      color: theme.colors.hex.text,
      bullet: { type: "bullet", code: "2022" }, 
      valign: "top",
      fontFace: "Arial",
      shrinkText: true // Prevents overflow by shrinking font size
    });

    // Image (Right side) - Only if enabled
    if (hasImage) {
      let base64Image = customSlideImages[i];

      // If no custom image, fetch from picsum
      if (!base64Image) {
        const seed = imageSeeds[i] || slide.imageKeyword;
        const imageUrl = `https://picsum.photos/seed/${seed}/800/800`;
        try {
          const fetched = await getBase64FromUrl(imageUrl);
          if (fetched) base64Image = fetched;
        } catch (e) {
          console.error("Error fetching image for slide", i, e);
        }
      }
      
      if (base64Image) {
         pptxSlide.addImage({
          data: base64Image,
          x: "58%", y: "25%", w: "37%", h: "60%",
          sizing: { type: "cover", w: "37%", h: "60%" }
        });
      }
    }

    // Speaker Notes
    if (slide.speakerNotes) {
      pptxSlide.addNotes(sanitizeText(slide.speakerNotes));
    }
  }

  try {
    // Replaced regex with a safer filename generator
    const safeTitle = presentation.mainTitle.replace(/[^a-zA-Z0-9а-яА-Я ]/g, "").substring(0, 30) || "Presentation";
    await pres.writeFile({ fileName: `${safeTitle}.pptx` });
  } catch (e) {
    console.error("PPTX Generation Error:", e);
    alert("Ошибка при сохранении файла. Попробуйте еще раз.");
  }
};