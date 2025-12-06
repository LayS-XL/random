import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParticleSystem } from './components/ParticleSystem';
import { Controls } from './components/Controls';
import { GeminiLiveService, blobToBase64 } from './services/geminiLive';
import { ParticleShape, GestureState, LiveConnectionState } from './types';

// Frame rate for sending images to Gemini (throttled to save bandwidth/credits)
const FPS = 2; 

const App: React.FC = () => {
  // Application State
  const [shape, setShape] = useState<ParticleShape>(ParticleShape.SPHERE);
  const [color, setColor] = useState<string>('#4f8cff');
  const [gesture, setGesture] = useState<GestureState>(GestureState.NEUTRAL);
  const [connection, setConnection] = useState<LiveConnectionState>({
    isConnected: false,
    isStreaming: false,
    error: null
  });

  // Refs for Video/Canvas management
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize Service
  useEffect(() => {
    serviceRef.current = new GeminiLiveService(
      (newGesture) => setGesture(newGesture),
      (error) => setConnection(prev => ({ ...prev, error, isConnected: false, isStreaming: false })),
      () => setConnection(prev => ({ ...prev, isConnected: false, isStreaming: false }))
    );
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    setConnection({ isConnected: false, isStreaming: true, error: null });

    try {
      // 1. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false // We don't strictly need audio for this visual demo
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 2. Connect to Gemini Live
      if (serviceRef.current) {
         await serviceRef.current.connect();
         setConnection({ isConnected: true, isStreaming: true, error: null });
         
         // 3. Start Frame Loop
         startFrameLoop();
      }
    } catch (e) {
      console.error(e);
      setConnection({ 
        isConnected: false, 
        isStreaming: false, 
        error: "Failed to access camera or connect to API. Please check permissions and API Key." 
      });
    }
  };

  const stopSession = () => {
    // Stop Frame Loop
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop Service
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }

    // Stop Video Stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    setConnection({ isConnected: false, isStreaming: false, error: null });
    setGesture(GestureState.NEUTRAL);
  };

  const startFrameLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !serviceRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      // Compress and convert to base64
      canvasRef.current.toBlob(async (blob) => {
        if (blob && serviceRef.current) {
           const base64 = await blobToBase64(blob);
           serviceRef.current.sendFrame(base64);
        }
      }, 'image/jpeg', 0.6); // Quality 0.6 to save bandwidth
      
    }, 1000 / FPS);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* Hidden Video/Canvas for processing */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* 3D Background */}
      <ParticleSystem 
        gesture={gesture} 
        shape={shape} 
        color={color} 
      />

      {/* UI Overlay */}
      <Controls 
        shape={shape}
        setShape={setShape}
        color={color}
        setColor={setColor}
        gesture={gesture}
        connection={connection}
        onConnect={startSession}
        onDisconnect={stopSession}
        toggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default App;
