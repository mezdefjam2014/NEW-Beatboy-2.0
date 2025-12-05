
export interface AudioFile {
  id: string;
  name: string;
  file: File;
  buffer: AudioBuffer | null;
  duration: number;
}

export interface EQSettings {
  low: number;      // 60Hz
  lowMid: number;   // 250Hz
  mid: number;      // 1kHz
  highMid: number;  // 5kHz
  high: number;     // 12kHz
}

export interface TagSettings {
  interval: 15 | 20 | 30;
  volume: number;
  enabled: boolean;
}

export interface AppState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  normalize: boolean;
  fadeEnding: boolean;
  limiter: boolean;
  targetSampleRate: 44100 | 48000;
}

export type SocialAspectRatio = '16:9' | '9:16';
export type VisualizerType = 'waveform' | 'trap-nation' | 'particles' | 'bars' | 'dual-bars' | 'oscilloscope' | 'eclipse' | 'matrix';
export type BackgroundType = 'image' | 'video';
export type ColorGradeType = 'none' | 'sepia' | 'high-contrast' | 'cyberpunk' | 'bw' | 'vhs' | 'glitch' | 'dreamy' | '1980s' | 'noir';

export interface VideoOverlay {
  id: string;
  label: string;
  text: string;
  x: number; // 0-1 percentage of width
  y: number; // 0-1 percentage of height
  visible: boolean;
  fontSize: number;
  color: string;
}

export interface VideoSettings {
  aspectRatio: SocialAspectRatio;
  isGenerating: boolean;
  previewUrl: string | null;
  artistName: string; // Kept for backward compat
  videoDuration: number; // in seconds
  fadeDuration: number; // Fade out duration in seconds
  
  // Advanced Visuals
  backgroundType: BackgroundType;
  backgroundUrl: string | null; // Blob URL for video
  logoUrl: string | null;
  logoScale: number; // 0.5 to 3.0
  logoX: number; // 0-1
  logoY: number; // 0-1
  
  fontFamily: string;
  visualizer: VisualizerType;
  motionBlur: boolean;
  colorGrade: ColorGradeType;
  
  // Editor Tools
  showGrid: boolean;
  snapToGrid: boolean;
  
  // Text Overlays
  overlays: VideoOverlay[];
}

export interface BulkExportState {
  isExporting: boolean;
  progress: number;
  currentFile: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    accent: string;      // Hex
    accentDim: string;   // Hex (usually with opacity in CSS var)
    bgMain: string;      // Hex
    bgPanel: string;     // Hex
    textMain: string;    // Hex
    textDim: string;     // Hex
    border: string;      // Hex
  };
}