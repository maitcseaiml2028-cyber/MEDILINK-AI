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
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCaptured(false);
      setErrorMsg(null);
    } catch (err) {
      console.error("Camera error:", err);
      setErrorMsg("Camera access denied or unavailable.");
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
    
    setIsDetecting(true);
    setErrorMsg(null);

    try {
      // 1. Detect face and get descriptor
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setErrorMsg("No clear face detected! Please face the camera and try again.");
        setIsDetecting(false);
        return;
      }

      // 2. Capture image frame from video to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 3. Draw bounding box purely for UI aesthetic
      faceapi.draw.drawDetections(canvas, detection);

      // 4. Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          setErrorMsg("Failed to process image.");
          setIsDetecting(false);
          return;
        }

        stopCamera();
        setIsCaptured(true);
        setIsDetecting(false);
        
        onCapture({
          imageBlob: blob,
          faceDescriptor: Array.from(detection.descriptor)
        });
        
      }, "image/jpeg", 0.9);

    } catch (err) {
      console.error("Capture process failed", err);
      setErrorMsg("An error occurred during face extraction.");
      setIsDetecting(false);
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
        <h4 className="text-sm font-bold text-green-800">Face Capture Successful!</h4>
        <p className="text-xs text-green-600 mb-4">Biometric data has been securely extracted.</p>
        <Button variant="outline" onClick={startCamera} className="h-8 text-xs bg-white text-slate-700">
          Retake Scan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border border-slate-200 p-4 rounded-2xl bg-white shadow-sm">
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center mx-auto w-full max-w-sm">
        {stream ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover mirror-x" 
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Invisible canvas for processing */}
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
        <div className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {!stream ? (
          <Button type="button" onClick={startCamera} className="bg-slate-800 text-white hover:bg-slate-700 rounded-xl">
            <Camera className="w-4 h-4 mr-2" /> Enable Camera
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleCapture} 
            disabled={isDetecting}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-8"
          >
            {isDetecting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning Face...</>
            ) : (
              <><ScanFace className="w-4 h-4 mr-2" /> Capture Face</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
