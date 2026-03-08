/**
 * Font family mapping for reader content.
 * Maps store values to CSS font-family strings.
 */
export const FONT_FAMILIES = {
  lora: "var(--font-lora), 'Georgia', serif",
  'system-serif': "'Georgia', 'Times New Roman', serif",
  'system-sans': "system-ui, -apple-system, sans-serif",
};

/**
 * Apply reader settings as CSS custom properties on the reader container.
 */
export function applyReaderStyles(element, settings) {
  if (!element) return;
  element.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
  element.style.setProperty('--reader-line-height', String(settings.lineHeight));
  element.style.setProperty('--reader-margin', `${settings.readerMargin}px`);
  element.style.fontFamily = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.lora;
}

export const THEMES = ['light', 'dark', 'sepia'];
