export type {
  ThemeDefinition,
  ThemeColors,
  ThemeTypography,
  ThemeSurfaces,
  ThemeEffects,
  ThemeMotion,
  SurfaceStyle,
  ShadowPreset,
  MotionPreset,
  ContrastSize,
  ContrastPair,
  A11yReport,
  HexColor,
  RgbaColor,
} from './types'

export {
  parseColor,
  toHex,
  toRgbaString,
  compositeOver,
  relativeLuminance,
  contrastRatio,
  rgbToHsl,
  hslToRgb,
  adjustLightness,
  pickReadableForeground,
  ensureContrast,
  type Rgb,
  type Rgba,
  type Hsl,
} from './color'

export { THRESHOLDS, wcagLevel, analyzeTheme, flattenSurface, suggestFix } from './contrast'

export {
  compileThemeToCssVars,
  compileThemeToCssText,
  themeDataAttributes,
  computeA11yFallback,
  type A11yFallback,
} from './compile'

export {
  themeDefinitionSchema,
  themeColorsSchema,
  themeExportSchema,
  type ThemeExport,
} from './schema'

export { PRESET_THEMES, PRESET_CATEGORY, DEFAULT_THEME, defaultThemeDefinition, NEUTRAL } from './presets'

export { deriveDarkTheme, deriveLightTheme, effectiveTheme, isDarkTheme } from './dark-mode'

export { extractPalette, buildThemesFromPalette, paletteFromMood, type Palette } from './palette'

export {
  buildFontFamily,
  compileFontVars,
  buildFontFaceCss,
  diffFontUsage,
  firstScreenBudget,
  type ResolvedFont,
  type FontRole,
  type FontAssignment,
  type FontSubset,
  type FontFaceSpec,
} from './fonts'

export {
  ZH_HANT_SLICES,
  LATIN_SLICES,
  CJK_CORE_CHARS,
  FIRST_SCREEN_BUDGET,
  zhHantSlices,
  slicesForScripts,
  budgetForScripts,
  pairingFirstScreenBytes,
  formatUnicodeRange,
  parseUnicodeRange,
  type UnicodeSlice,
} from './unicode-ranges'

export {
  GLASS_BUDGET,
  glassBudgetFor,
  assignGlass,
  type GlassBreakpoint,
} from './glass-budget'

export {
  compareLocalFeatures,
  colorDistance,
  type LocalFeatures,
  type FeatureComparison,
  type ColorDiff,
} from './compare'

export {
  draftsFromLocalFeatures,
  type LocalFeaturesInput,
  type ThemeDraft,
} from './from-features'
