export enum ParticleShape {
  SPHERE = 'SPHERE',
  CUBE = 'CUBE',
  TORUS = 'TORUS',
  HELIX = 'HELIX',
  RANDOM = 'RANDOM'
}

export enum GestureState {
  NEUTRAL = 'NEUTRAL',
  OPEN = 'OPEN',     // Expand/Diffuse
  CLOSED = 'CLOSED'  // Shrink/Contract
}

export interface ParticleConfig {
  color: string;
  shape: ParticleShape;
  count: number;
}

export interface LiveConnectionState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}
