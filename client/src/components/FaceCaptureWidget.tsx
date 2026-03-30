import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ScanFace, CheckCircle2 } from "lucide-react";

interface FaceCaptureResult {
  imageBlob: Blob;
  faceDescriptor: number[]; // 128-d float array
}

interface FaceCaptureWidgetProps {
  onCapture: (result: FaceCaptureResult) => void;
  mode?: "register" | "verify";
}

export function FaceCaptureWidget({ onCapture, mode = "register" }: FaceCaptureWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        if (active) setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        if (active) setErrorMsg("Failed to load AI models. Please check your internet connection.");
      }
    };
    loadModels();
    
    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  // Fix: Ensure stream is attached to video element when stream or videoRef changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      // Force play if needed
      videoRef.current.play().catch(e => console.error("Video play failed:", e));
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      setStream(mediaStream);
      setIsCaptured(false);
      setErrorMsg(null);
      console.log("Camera started successfully.");
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setErrorMsg("Camera access denied. Please enable camera permissions in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera device found. Please connect a camera.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setErrorMsg("Camera is already in use by another application.");
      } else {
        setErrorMsg(`Camera error: ${err.message || "Unknown error"}. Please try refreshing.`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    
    setIsRecording(true);
    setProgress(0);
    setErrorMsg(null);

    let bestDetection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection; }>> | null = null;
    const startTime = Date.now();
    const duration = 3000; // 3 seconds video capture

    const scanInterval = setInterval(async () => {
      if (!videoRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          bestDetection = detection;
        }
      } catch (e) {
        console.warn("Detection error during scan:", e);
      }

      if (elapsed >= duration) {
        clearInterval(scanInterval);
        processFinalCapture(bestDetection);
      }
    }, 100);
  };

  const processFinalCapture = async (detection: any) => {
    if (!detection) {
      setErrorMsg("No clear face detected during the 3-second scan! Please face the camera and try again.");
      setIsRecording(false);
      return;
    }

    try {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, detection);

      canvas.toBlob((blob) => {
        if (!blob) {
          setErrorMsg("Failed to process image.");
          setIsRecording(false);
          return;
        }

        stopCamera();
        setIsCaptured(true);
        setIsRecording(false);
        
        onCapture({
          imageBlob: blob,
          faceDescriptor: Array.from(detection.descriptor)
        });
        
      }, "image/jpeg", 0.9);

    } catch (err) {
      console.error("Capture process failed", err);
      setErrorMsg("An error occurred during face extraction.");
      setIsRecording(false);
    }
  };

  if (!modelsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Initializing AI Face Models...</p>
      </div>
    );
  }

  if (isCaptured) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-green-200 rounded-2xl bg-green-50 shadow-inner">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
        <h4 className="text-sm font-bold text-green-800">Face Scan Successful!</h4>
        <p className="text-xs text-green-600 mb-4">Biometric video data has been securely processed.</p>
        <Button variant="outline" type="button" onClick={startCamera} className="h-8 text-xs bg-white text-slate-700">
          Retake Scan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border border-slate-200 p-4 rounded-2xl bg-white shadow-sm">
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center mx-auto w-full max-w-sm border-4 border-slate-800 shadow-xl">
        {stream ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              onLoadedMetadata={() => videoRef.current?.play()}
              className="absolute inset-0 w-full h-full object-cover" 
              style={{ transform: "scaleX(-1)" }}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-blue-600/10 flex flex-col items-center justify-end p-6">
                <div className="w-full bg-white/20 backdrop-blur-md h-3 rounded-full overflow-hidden border border-white/30 mb-2">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <p className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">Scanning Video Stream...</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </>
        ) : (
          <div className="text-center p-4">
            <ScanFace className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-slate-400">Camera is inactive</p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100 text-center animate-in fade-in zoom-in duration-300">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {!stream ? (
          <Button type="button" onClick={startCamera} className="bg-slate-800 text-white hover:bg-slate-700 rounded-xl px-6 h-11 flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
            <Camera className="w-4 h-4" /> Enable Camera
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleCapture} 
            disabled={isRecording}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-10 h-11 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isRecording ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording Face...</>
            ) : (
              <><Camera className="w-4 h-4 mr-2" /> Start 3s Video Scan</>
            )}
          </Button>
        )}
      </div>
      <p className="text-[10px] text-slate-400 text-center italic">
        A short 3-second video scan ensures high-accuracy biometric verification.
      </p>
    </div>
  );
}
