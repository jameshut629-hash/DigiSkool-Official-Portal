import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Flashlight,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Phone,
  CreditCard,
  BookOpen,
  Calendar,
  User,
  Printer,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Volume2,
  VolumeX,
  CameraOff,
  Sparkles,
  Lock,
  FileImage,
  Layers,
  ArrowRight
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewStudentDetails?: (studentId: number) => void;
  onOpenPrintVoucher?: (voucherId: number) => void;
  onOpenPrintIdCard?: (student: Student) => void;
}

interface VerificationData {
  student: Student;
  enrollments: any[];
  vouchers: any[];
  payments: any[];
  financialSummary: {
    totalPayable: number;
    totalPaid: number;
    outstanding: number;
  };
  verification: {
    verified: boolean;
    verifiedAt: string;
    verifiedBy: string;
    status: string;
    isClear: boolean;
    activeCoursesCount: number;
    searchedCode: string;
  };
}

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = ({
  isOpen,
  onClose,
  onViewStudentDetails,
  onOpenPrintVoucher,
  onOpenPrintIdCard
}) => {
  // Camera & Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanning loop state
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Verification lookup state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Manual search fallback input
  const [manualCode, setManualCode] = useState('');

  // Clean Web Audio Confirmation Chime
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Pleasant ascending double-tone chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.22);
      osc2.stop(ctx.currentTime + 0.22);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Enumerate video devices
  const listCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
    }
  };

  // Start Camera Feed
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setIsPermissionDenied(false);
    stopCamera();

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsPermissionDenied(true);
        setCameraError('Camera API is not supported in this browser environment. Please use image upload or manual student ID lookup.');
        setIsScanning(false);
        return;
      }

      // Check permission state if Permissions API is supported
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (perm.state === 'denied') {
            setIsPermissionDenied(true);
            setCameraError('Camera permission was denied in your browser settings. Please allow camera permissions in your address bar or use Image Upload.');
            setIsScanning(false);
            return;
          }
        } catch {
          // Permissions API for camera not implemented in all browsers - continue
        }
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play interrupted:', playErr);
        }
      }

      // Check for torch capability
      const track = newStream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);
      }

      setIsScanning(true);
      await listCameras();
    } catch (err: any) {
      console.warn('Camera could not be started:', err?.name || 'UnknownError', err?.message);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        (err?.message && /denied|not allowed|permission/i.test(err.message));

      if (isDenied) {
        setIsPermissionDenied(true);
        setCameraError(
          'Camera permission was denied or restricted by browser settings. Please allow camera access in the browser address bar or use photo upload / manual student search.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('No camera detected on this device. You can upload an ID card photo or search student ID directly.');
      } else {
        setCameraError(err?.message || 'Unable to access camera feed.');
      }
      setIsScanning(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // Stop Camera Feed
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch failed:', err);
    }
  };

  // Switch Facing Mode (Front <-> Back)
  const switchFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedCameraId('');
  };

  // Lifecycle when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setVerificationResult(null);
      setVerificationError(null);
      setLastScannedCode(null);
      if (scannerMode === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scannerMode, facingMode, selectedCameraId]);

  // Execute verification query on server
  const verifyStudentCode = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    const trimmed = rawCode.trim();

    setVerifying(true);
    setVerificationError(null);

    try {
      const data = await apiRequest<VerificationData>('/api/students/scan-verify', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed })
      });

      playBeep();
      setVerificationResult(data);
      setIsScanning(false);
    } catch (err: any) {
      setVerificationError(err.message || `No student record found for "${trimmed}".`);
    } finally {
      setVerifying(false);
    }
  };

  // Continuous Camera QR Code Frame Processing Loop
  useEffect(() => {
    if (!isScanning || !isOpen || verificationResult) return;

    let isScanningLoopActive = true;

    // Check if browser has native BarcodeDetector API
    const barcodeDetector =
      'BarcodeDetector' in window
        ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        : null;

    const scanFrame = async () => {
      if (!isScanningLoopActive || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          let detectedCode: string | null = null;

          // 1. Try Native hardware-accelerated BarcodeDetector
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(canvas);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {
              // fallback to jsQR below
            }
          }

          // 2. Try jsQR (cross-browser fallback)
          if (!detectedCode) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });

            if (qrResult && qrResult.data) {
              detectedCode = qrResult.data;
            }
          }

          // On Successful QR Code Detection
          if (detectedCode && detectedCode !== lastScannedCode) {
            setLastScannedCode(detectedCode);
            isScanningLoopActive = false;
            verifyStudentCode(detectedCode);
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanningLoopActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, isOpen, verificationResult, lastScannedCode]);

  // Image Upload File Handler (Upload ID Card photo to scan)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        let codeFound: string | null = null;

        // Try native detector
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            if (barcodes && barcodes.length > 0) {
              codeFound = barcodes[0].rawValue;
            }
          } catch {}
        }

        // Try jsQR
        if (!codeFound) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (qr) {
            codeFound = qr.data;
          }
        }

        if (codeFound) {
          verifyStudentCode(codeFound);
        } else {
          setVerificationError('No readable QR code found in the uploaded image. Please ensure the QR code on the ID card is sharp and well-lit.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input so user can re-upload if needed
    e.target.value = '';
  };

  // Reset Scanner for next student
  const handleScanNext = () => {
    setVerificationResult(null);
    setVerificationError(null);
    setLastScannedCode(null);
    setManualCode('');
    if (scannerMode === 'camera') {
      startCamera();
    } else {
      setIsScanning(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6E1231] to-[#8d193f] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Student ID Card Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {scannerMode === 'camera' ? 'Live Camera' : scannerMode === 'upload' ? 'Image Upload' : 'Manual Search'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Scan QR code from student ID card, upload a card photo, or search by student ID
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (only when not showing verified result) */}
        {!verificationResult && (
          <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScannerMode('camera')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scannerMode === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#6E1231]" />
              <span>Live Camera</span>
            </button>

            <button
              type="button"
              onClick={() => setScannerMode('upload')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scannerMode === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Upload ID Card</span>
            </button>

            <button
              type="button"
              onClick={() => setScannerMode('manual')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scannerMode === 'manual'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Manual Student ID</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* STATE 1: VERIFIED RESULT CARD */}
          {verificationResult ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Verification Header Badge */}
              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                verificationResult.verification.isClear
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    verificationResult.verification.isClear
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-amber-600 text-white shadow-sm'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm font-display leading-tight flex items-center gap-2">
                      <span>Identity Verified Successfully</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        verificationResult.student.status === 'active'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {verificationResult.student.status}
                      </span>
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Scanned Code: <code className="font-mono font-bold">{verificationResult.verification.searchedCode}</code> • Verified by {verificationResult.verification.verifiedBy}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black inline-block ${
                    verificationResult.verification.isClear
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {verificationResult.verification.isClear
                      ? '✓ Fee Cleared'
                      : `Pending: ${formatPKR(verificationResult.financialSummary.outstanding)}`}
                  </span>
                </div>
              </div>

              {/* Student Profile Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-inner">
                      <User className="w-8 h-8 stroke-1" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {verificationResult.student.full_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                        <span className="font-bold text-[#6E1231] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          {verificationResult.student.student_id}
                        </span>
                        {verificationResult.student.registration_no && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Reg: {verificationResult.student.registration_no}
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span>{verificationResult.student.campus || 'Main Campus'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {onOpenPrintIdCard && (
                      <button
                        type="button"
                        onClick={() => onOpenPrintIdCard(verificationResult.student)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print ID Card</span>
                      </button>
                    )}

                    {onViewStudentDetails && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewStudentDetails(verificationResult.student.id);
                          onClose();
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Full Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Father / Guardian</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {verificationResult.student.father_name || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone / Contact</span>
                    <span className="font-semibold text-slate-800 font-mono truncate block mt-0.5">
                      {verificationResult.student.phone || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">CNIC / B-Form</span>
                    <span className="font-semibold text-slate-800 font-mono truncate block mt-0.5">
                      {verificationResult.student.cnic_bform || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Admission Date</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {verificationResult.student.admission_date ? formatDate(verificationResult.student.admission_date) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Enrolled Courses & Batches */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-display mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#6E1231]" />
                    <span>Enrolled Courses & Active Batches ({verificationResult.enrollments?.length || 0})</span>
                  </h4>
                  {verificationResult.enrollments && verificationResult.enrollments.length > 0 ? (
                    <div className="space-y-1.5">
                      {verificationResult.enrollments.map((enr: any) => (
                        <div
                          key={enr.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{enr.course_name}</span>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Batch: <strong>{enr.batch_name}</strong></span>
                              {enr.teacher_name && <span>• Teacher: {enr.teacher_name}</span>}
                              {enr.start_time && <span>• {enr.start_time} - {enr.end_time}</span>}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            enr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {enr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No active batch enrollments found.</p>
                  )}
                </div>

                {/* Financial Overview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Fee</span>
                      <span className="font-bold text-slate-900">{formatPKR(verificationResult.financialSummary.totalPayable)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Paid</span>
                      <span className="font-bold text-emerald-600">{formatPKR(verificationResult.financialSummary.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Balance Due</span>
                      <span className={`font-bold ${verificationResult.financialSummary.outstanding > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {formatPKR(verificationResult.financialSummary.outstanding)}
                      </span>
                    </div>
                  </div>

                  {verificationResult.vouchers && verificationResult.vouchers.length > 0 && onOpenPrintVoucher && (
                    <button
                      type="button"
                      onClick={() => onOpenPrintVoucher(verificationResult.vouchers[0].id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Print Latest Voucher
                    </button>
                  )}
                </div>
              </div>

              {/* Action Bar: Scan Next Card */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#6E1231] to-[#8d193f] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Next Student ID Card</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close Scanner
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: SCANNER MODES (CAMERA / UPLOAD / MANUAL) */
            <div className="space-y-4">
              {/* MODE A: LIVE CAMERA SCANNER */}
              {scannerMode === 'camera' && (
                <div className="space-y-4">
                  {/* Camera Feed Container */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 sm:aspect-16/9 flex items-center justify-center border-2 border-slate-800 shadow-inner">
                    {/* Hidden canvas for offscreen frame processing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* HTML5 Video Element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Loading Overlay */}
                    {cameraLoading && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white z-20">
                        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-xs font-medium">Initializing camera feed...</p>
                      </div>
                    )}

                    {/* Camera Error / Permission Denied Overlay */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-5 sm:p-6 text-white z-20 space-y-3 animate-in fade-in">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                          isPermissionDenied
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isPermissionDenied ? <CameraOff className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        </div>

                        <div className="max-w-md">
                          <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                            {isPermissionDenied ? 'Camera Access Denied or Blocked' : 'Camera Unavailable'}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {cameraError}
                          </p>

                          {isPermissionDenied && (
                            <div className="mt-2.5 p-2.5 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-300 text-left space-y-1">
                              <p className="font-semibold text-amber-300 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Quick Steps to Allow Camera:
                              </p>
                              <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                                <li>Click the padlock 🔒 or camera icon in the browser address bar.</li>
                                <li>Change <strong>Camera</strong> permission to <strong>Allow</strong>.</li>
                                <li>Click <strong>Retry Camera</strong> below, or use <strong>Upload / Manual</strong> options.</li>
                              </ol>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-gradient-to-r from-[#6E1231] to-[#8d193f] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Camera</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setScannerMode('upload');
                              fileInputRef.current?.click();
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload ID Card Image</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setScannerMode('manual')}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Manual Student Lookup</span>
                          </button>
                        </div>

                        {/* QR Camera verification prompt */}
                        <div className="pt-2 border-t border-white/10 text-center text-[11px] text-slate-300">
                          <span>Hold QR code steady in camera view for instant automatic detection</span>
                        </div>
                      </div>
                    )}

                    {/* Scanning Verifying Spinner Overlay */}
                    {verifying && (
                      <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center text-white z-30">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-sm font-bold font-display">Verifying Student Record...</p>
                        <p className="text-xs text-slate-400 mt-0.5">Searching institutional database</p>
                      </div>
                    )}

                    {/* Scanning Reticle & Animated Laser Line */}
                    {isScanning && !cameraLoading && !cameraError && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Viewfinder Target Box */}
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/40 rounded-2xl overflow-hidden shadow-2xl backdrop-contrast-125">
                          {/* 4 Corner Markers */}
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg" />

                          {/* Animated Scanning Laser Line */}
                          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-[bounce_2.2s_infinite]" />

                          {/* Subtle center crosshair */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <div className="w-4 h-0.5 bg-white" />
                            <div className="h-4 w-0.5 bg-white absolute" />
                          </div>
                        </div>

                        {/* Instruction Tag */}
                        <div className="absolute bottom-4 inset-x-0 flex justify-center">
                          <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold rounded-full border border-white/20 shadow-lg">
                            Center QR code within frame
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Top Camera Controls Overlay */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                      {/* Camera Switcher */}
                      <div className="flex items-center gap-1.5">
                        {cameras.length > 1 && (
                          <select
                            value={selectedCameraId}
                            onChange={(e) => setSelectedCameraId(e.target.value)}
                            className="bg-slate-900/80 backdrop-blur-md text-white border border-white/20 rounded-xl px-2.5 py-1 text-xs font-medium cursor-pointer"
                          >
                            {cameras.map((c, i) => (
                              <option key={c.deviceId} value={c.deviceId} className="bg-slate-900 text-white">
                                {c.label || `Camera ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={switchFacingMode}
                          title="Flip Camera (Front/Rear)"
                          className="p-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Flashlight / Torch */}
                      {hasTorch && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          title={torchOn ? 'Turn Torch Off' : 'Turn Torch On'}
                          className={`p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
                            torchOn
                              ? 'bg-amber-500 text-white border-amber-400'
                              : 'bg-slate-900/80 text-white border-white/20 hover:bg-slate-800'
                          }`}
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE B: IMAGE UPLOAD SCANNER */}
              {scannerMode === 'upload' && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
                    <FileImage className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Upload Student ID Card Photo</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Select or drop a photo or screenshot of the student ID card containing the QR code.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose ID Image File</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODE C: MANUAL STUDENT ID SEARCH */}
              {scannerMode === 'manual' && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#6E1231]" />
                      <span>Lookup Student by ID, CNIC or Phone</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter the student's unique ID, registration number, CNIC/B-Form, or mobile number to retrieve their verification profile.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualCode.trim()) verifyStudentCode(manualCode);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="e.g. DS-STD-0001, 35201-1234567-1, 0300-1234567"
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#6E1231]"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualCode.trim() || verifying}
                      className="px-4 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Verification Error Notice */}
              {verificationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationError(null);
                      setIsScanning(true);
                    }}
                    className="text-xs font-bold text-rose-700 hover:underline shrink-0"
                  >
                    Dismiss &amp; Retry
                  </button>
                </div>
              )}

              {/* Quick Fallback Methods Toolbar (when in camera mode) */}
              {scannerMode === 'camera' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 1. Upload ID Photo */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Scan from Image File</p>
                        <p className="text-[10px] text-slate-500">Upload ID photo or screenshot</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('upload');
                        setTimeout(() => fileInputRef.current?.click(), 50);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      Browse
                    </button>
                  </div>

                  {/* 2. Manual Student Code Search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualCode.trim()) verifyStudentCode(manualCode);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Student ID (e.g. DS-STD-0001)"
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#6E1231]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualCode.trim() || verifying}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Lookup
                    </button>
                  </form>
                </div>
              )}

              {/* Student Verification Guide */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Scan physical Student ID card QR code or enter Student ID above for instant record lookup</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
