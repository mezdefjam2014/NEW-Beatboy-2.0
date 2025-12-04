
import JSZip from 'jszip';

/**
 * Decodes an ArrayBuffer into an AudioBuffer
 */
export const decodeAudio = async (ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
  return await ctx.decodeAudioData(arrayBuffer);
};

/**
 * Creates a limiter node chain (Compressor with high ratio/fast attack)
 */
export const createLimiter = (ctx: BaseAudioContext) => {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -1.0;
  compressor.knee.value = 0;
  compressor.ratio.value = 20.0; // Brick-wall-ish
  compressor.attack.value = 0.005; // 5ms lookahead/attack
  compressor.release.value = 0.1;
  return compressor;
};

/**
 * Normalizes an AudioBuffer to a specific dB peak
 */
const normalizeBuffer = (buffer: AudioBuffer, targetDb: number): AudioBuffer => {
  const target = Math.pow(10, targetDb / 20); // Convert dB to linear
  const channels = buffer.numberOfChannels;
  let maxPeak = 0;

  // Find peak
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
       const abs = Math.abs(data[i]);
       if (abs > maxPeak) maxPeak = abs;
    }
  }

  if (maxPeak === 0) return buffer;

  // Calculate gain required
  const gain = target / maxPeak;
  
  // Apply gain if it results in a significant change
  if (Math.abs(gain - 1) > 0.001) {
    for (let c = 0; c < channels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        data[i] *= gain;
      }
    }
  }

  return buffer;
};

/**
 * Creates an offline audio context to mix the beat, apply EQ, and add tags.
 */
export const renderProcessedAudio = async (
  mainBuffer: AudioBuffer,
  tagBuffer: AudioBuffer | null,
  eqSettings: { [key: string]: number },
  options: {
    normalize: boolean;
    fadeEnding: boolean;
    tagInterval: number;
    targetSampleRate?: number;
    limiter: boolean;
  }
): Promise<AudioBuffer> => {
  const sampleRate = options.targetSampleRate || mainBuffer.sampleRate;
  
  // Calculate new length based on target sample rate
  const length = Math.ceil(mainBuffer.duration * sampleRate);

  // Create OfflineContext with target sample rate
  const offlineCtx = new OfflineAudioContext(
    mainBuffer.numberOfChannels,
    length,
    sampleRate
  );

  // --- SIGNAL CHAIN ---
  // [Music Source] -> [EQ] --\
  //                           +--> [Master Mix Bus] -> [Fade] -> [Limiter] -> [Destination]
  // [Tag Source]   ----------/

  // 1. Master Chain Setup (The end of the line)
  const masterBus = offlineCtx.createGain();
  let finalNode: AudioNode = masterBus;

  // Apply Fade Out (Automation on Master Bus or separate Fade Node)
  const fadeNode = offlineCtx.createGain();
  masterBus.connect(fadeNode);
  finalNode = fadeNode;

  if (options.fadeEnding) {
    const duration = mainBuffer.duration;
    const fadeDuration = 3.0; // 3 seconds fade
    // Ensure we don't start fade before track starts
    const fadeStart = Math.max(0, duration - fadeDuration);
    
    fadeNode.gain.setValueAtTime(1, fadeStart);
    fadeNode.gain.linearRampToValueAtTime(0, duration);
  }

  // Apply Limiter
  if (options.limiter) {
    const limiter = createLimiter(offlineCtx);
    finalNode.connect(limiter);
    finalNode = limiter;
  }

  // Connect to Output
  finalNode.connect(offlineCtx.destination);


  // 2. Music Setup
  const musicSource = offlineCtx.createBufferSource();
  musicSource.buffer = mainBuffer;

  // EQ Chain for Music
  const createFilter = (type: BiquadFilterType, freq: number, gain: number) => {
    const filter = offlineCtx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.gain.value = gain;
    return filter;
  };

  const filters: BiquadFilterNode[] = [];
  filters.push(createFilter('lowshelf', 60, eqSettings.low));
  filters.push(createFilter('peaking', 250, eqSettings.lowMid));
  filters.push(createFilter('peaking', 1000, eqSettings.mid));
  filters.push(createFilter('peaking', 5000, eqSettings.highMid));
  filters.push(createFilter('highshelf', 12000, eqSettings.high));

  // Connect Music -> Filters -> Master Bus
  let currentMusicNode: AudioNode = musicSource;
  filters.forEach(f => {
    currentMusicNode.connect(f);
    currentMusicNode = f;
  });
  currentMusicNode.connect(masterBus);
  
  // Start Music
  musicSource.start(0);


  // 3. Tag Setup
  if (tagBuffer && options.tagInterval > 0) {
    let startTime = 0;
    // Loop tags until 2 seconds before end
    while (startTime < mainBuffer.duration - 2) { 
      const tagSource = offlineCtx.createBufferSource();
      tagSource.buffer = tagBuffer;
      
      const tagGain = offlineCtx.createGain();
      tagGain.gain.value = 0.6; // slightly quieter than main, mix to taste

      tagSource.connect(tagGain);
      tagGain.connect(masterBus); // Mix tags into master so they get Faded/Limited too
      
      tagSource.start(startTime);
      startTime += options.tagInterval;
    }
  }

  // 4. Render
  let renderedBuffer = await offlineCtx.startRendering();

  // 5. Post-Process Normalize
  // We do this on the buffer values because WebAudio normalization is static math, not dynamic compression
  if (options.normalize) {
    renderedBuffer = normalizeBuffer(renderedBuffer, -1.0); // -1.0 dBFS
  }

  return renderedBuffer;
};

export const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this parser)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // clamp
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      // scale to 16-bit signed int
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

export const generateZip = async (files: { name: string; blob: Blob }[]) => {
    const zip = new JSZip();
    files.forEach(f => {
        zip.file(f.name, f.blob);
    });
    return await zip.generateAsync({ type: 'blob' });
};
