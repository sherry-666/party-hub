/**
 * Generate placeholder MP3 audio files for the Music Spy game.
 * Each pair generates two distinct tones (normal + spy) using raw WAV encoding.
 * These are simple sine wave tones — replace with real music later.
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'music-spy');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Generate a WAV file buffer with a simple sine wave tone
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} sampleRate - Sample rate
 * @returns {Buffer}
 */
function generateWav(frequency, duration, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt  sub-chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, offset); offset += 2;  // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data sub-chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate sine wave samples with envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Apply fade-in and fade-out envelope
    const fadeIn = Math.min(1, t / 0.1);
    const fadeOut = Math.min(1, (duration - t) / 0.1);
    const envelope = fadeIn * fadeOut;
    
    // Add slight vibrato and harmonics for richness
    const vibrato = 1 + 0.003 * Math.sin(2 * Math.PI * 5 * t);
    const sample = envelope * (
      0.6 * Math.sin(2 * Math.PI * frequency * vibrato * t) +
      0.2 * Math.sin(2 * Math.PI * frequency * 2 * t) +
      0.1 * Math.sin(2 * Math.PI * frequency * 3 * t)
    );
    
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.8)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Generate a more complex melody WAV
 */
function generateMelody(notes, noteDuration, sampleRate = 44100) {
  const totalDuration = notes.length * noteDuration;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt sub-chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data sub-chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  const samplesPerNote = Math.floor(sampleRate * noteDuration);

  for (let noteIdx = 0; noteIdx < notes.length; noteIdx++) {
    const freq = notes[noteIdx];
    for (let i = 0; i < samplesPerNote; i++) {
      const t = i / sampleRate;
      const noteT = i / samplesPerNote;
      
      // ADSR-like envelope
      let envelope;
      if (noteT < 0.05) envelope = noteT / 0.05; // attack
      else if (noteT < 0.15) envelope = 1 - 0.3 * ((noteT - 0.05) / 0.1); // decay
      else if (noteT < 0.85) envelope = 0.7; // sustain
      else envelope = 0.7 * (1 - (noteT - 0.85) / 0.15); // release

      const sample = envelope * (
        0.5 * Math.sin(2 * Math.PI * freq * t) +
        0.2 * Math.sin(2 * Math.PI * freq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * freq * 0.5 * t)
      );

      const sampleIdx = noteIdx * samplesPerNote + i;
      if (offset + 2 <= buffer.length) {
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.7)));
        buffer.writeInt16LE(intSample, offset);
      }
      offset += 2;
    }
  }

  return buffer;
}

// Musical note frequencies
const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
};

// Define 10 pairs of distinct melodies
const pairs = [
  { // Pair 1: Pop
    normal: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4],
    spy:    [NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4],
  },
  { // Pair 2: Electronic
    normal: [NOTE.E4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.E4, NOTE.G4, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.G4, NOTE.A4],
    spy:    [NOTE.A4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.C5, NOTE.D5],
  },
  { // Pair 3: Jazz
    normal: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.A4],
    spy:    [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.A4, NOTE.C5, NOTE.D5],
  },
  { // Pair 4: Classical
    normal: [NOTE.G4, NOTE.A4, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.C5],
    spy:    [NOTE.C4, NOTE.D4, NOTE.E4, NOTE.F4, NOTE.G4, NOTE.F4, NOTE.E4, NOTE.D4, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.F4],
  },
  { // Pair 5: Rock
    normal: [NOTE.E4, NOTE.E4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4],
    spy:    [NOTE.A3, NOTE.A3, NOTE.A3, NOTE.C4, NOTE.D4, NOTE.D4, NOTE.C4, NOTE.A3, NOTE.A3, NOTE.C4, NOTE.D4, NOTE.E4],
  },
  { // Pair 6: Lo-Fi
    normal: [NOTE.D4, NOTE.F4, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.D4, NOTE.F4, NOTE.G4, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.D4],
    spy:    [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.G4, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.G4],
  },
  { // Pair 7: Funk
    normal: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4, NOTE.D4, NOTE.B3, NOTE.G3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.C4, NOTE.A3],
    spy:    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.D4, NOTE.F4, NOTE.A4, NOTE.F4, NOTE.D4],
  },
  { // Pair 8: Ambient
    normal: [NOTE.C4, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G4, NOTE.E4, NOTE.C4],
    spy:    [NOTE.F4, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C5, NOTE.F5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C5, NOTE.A4, NOTE.F4],
  },
  { // Pair 9: Latin
    normal: [NOTE.A4, NOTE.B4, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.A4],
    spy:    [NOTE.D4, NOTE.E4, NOTE.F4, NOTE.D4, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.F4, NOTE.G4, NOTE.F4, NOTE.E4, NOTE.D4],
  },
  { // Pair 10: Cinematic
    normal: [NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.G4, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5],
    spy:    [NOTE.A3, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.B4, NOTE.A4, NOTE.E4, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5],
  },
];

console.log('Generating placeholder audio files...');

pairs.forEach((pair, idx) => {
  const pairNum = String(idx + 1).padStart(2, '0');
  
  const normalWav = generateMelody(pair.normal, 0.5); // 0.5s per note = 6s total
  const spyWav = generateMelody(pair.spy, 0.5);
  
  const normalPath = path.join(OUTPUT_DIR, `pair_${pairNum}_normal.wav`);
  const spyPath = path.join(OUTPUT_DIR, `pair_${pairNum}_spy.wav`);
  
  fs.writeFileSync(normalPath, normalWav);
  fs.writeFileSync(spyPath, spyWav);
  
  console.log(`  ✓ Pair ${pairNum}: ${normalPath}`);
  console.log(`             ${spyPath}`);
});

// Also generate a "silence" file for whiteboard players (1 second of silence)
const silenceBuffer = generateWav(0, 1);
const silencePath = path.join(OUTPUT_DIR, 'silence.wav');
fs.writeFileSync(silencePath, silenceBuffer);
console.log(`  ✓ Silence: ${silencePath}`);

console.log(`\nDone! Generated ${pairs.length * 2 + 1} audio files in ${OUTPUT_DIR}`);
