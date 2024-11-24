import React, { useCallback, useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, ScanBarcode, Camera, Flashlight, FlipHorizontal, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/authContext';

const IconButton = ({ children, onClick, className = "" }) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-full hover:bg-yellow-100/10 active:bg-yellow-100/20 transition-colors ${className}`}
  >
    {children}
  </button>
);

const Scanner = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const [scannerState, setScannerState] = useState({
    isScanning: false,
    hasPermission: false,
    isProcessing: false,
    torchOn: false,
    error: null,
    debugMessage: '',
  });
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const navigate = useNavigate();
  const { authenticatedRequest } = useAuth();

  // Initialize basic setup
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle camera enumeration
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
        setScannerState(prev => ({
          ...prev,
          error: 'Failed to find cameras',
          debugMessage: `Camera enum failed: ${err.message}`
        }));
      }
    };

    loadCameras();
  }, []);

  const startScanning = useCallback(() => {
    if (!videoRef.current || scannerState.isProcessing) return;

    const scan = async () => {
      if (!videoRef.current || !scannerState.isScanning) return;

      try {
        const result = await readerRef.current.decodeOnceFromVideoElement(videoRef.current);
        if (result) {
          await handleBarcodeDetected(result.text);
        }
      } catch (error) {
        if (error.message !== 'No MultiFormat Readers were able to detect the code.') {
          console.error('Scanning error:', error);
        }
      }

      if (scannerState.isScanning) {
        requestAnimationFrame(scan);
      }
    };

    requestAnimationFrame(scan);
  }, [scannerState.isScanning, scannerState.isProcessing]);

  const requestCameraAccess = async () => {
    try {
      setScannerState(prev => ({ 
        ...prev, 
        debugMessage: 'Requesting camera access...',
        error: null 
      }));

      if (!videoRef.current) {
        throw new Error('Video element not found in DOM');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });

      streamRef.current = stream;
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;

      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(resolve);
        };
      });

      setScannerState(prev => ({
        ...prev,
        hasPermission: true,
        isScanning: true,
        error: null,
        debugMessage: 'Camera started successfully'
      }));

      startScanning();
    } catch (err) {
      console.error('Camera access error:', err);
      setScannerState(prev => ({
        ...prev,
        hasPermission: false,
        error: 'Failed to access camera. Please check permissions.',
        debugMessage: `Access failed: ${err.message}`
      }));
    }
  };

  const handleBarcodeDetected = async (barcode) => {
    if (scannerState.isProcessing) return;
    
    setScannerState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      if (!isValidBarcode(barcode)) {
        throw new Error('Invalid barcode format');
      }

      const productResponse = await authenticatedRequest('get', `/api/v1/barcode/${barcode}`);
      
      await authenticatedRequest('post', '/data/history/add', {
        productCode: barcode,
        timestamp: new Date().toISOString(),
        productData: productResponse.data
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      navigate(`/product/${barcode}`);
    } catch (err) {
      setScannerState(prev => ({
        ...prev,
        isProcessing: false,
        isScanning: false,
        error: getErrorMessage(err)
      }));
    }
  };

  const isValidBarcode = (barcode) => {
    const barcodeRegex = /^[0-9]{8,14}$/;
    return barcodeRegex.test(barcode);
  };

  const getErrorMessage = (error) => {
    if (error.message === 'Invalid barcode format') {
      return 'Invalid barcode format detected';
    }
    if (error.response) {
      const status = error.response.status;
      const messages = {
        400: 'Invalid barcode format',
        404: 'Product not found',
        503: 'Service temporarily unavailable',
      };
      return messages[status] || 'Failed to fetch product information';
    }
    return error.request ? 'Network error - please check your connection' : 'An unexpected error occurred';
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track.getCapabilities().torch) {
        await track.applyConstraints({
          advanced: [{ torch: !scannerState.torchOn }]
        });
        setScannerState(prev => ({ ...prev, torchOn: !prev.torchOn }));
      }
    }
  };

  const switchCamera = async () => {
    const currentIndex = cameras.findIndex(camera => camera.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].deviceId);
    await requestCameraAccess();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await readerRef.current.decodeFromImageUrl(imageUrl);
      
      if (result) {
        await handleBarcodeDetected(result.text);
      } else {
        throw new Error('No barcode found in image');
      }
    } catch (err) {
      setScannerState(prev => ({
        ...prev,
        error: 'Could not detect barcode in image'
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="relative bg-yellow-50 p-4 flex justify-between items-center">
        <IconButton onClick={() => navigate('/')}>
          <X className="w-6 h-6" />
        </IconButton>
        
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold">
          Scan Product
        </h1>
        
        <div className="flex gap-2">
          {cameras.length > 1 && (
            <IconButton onClick={switchCamera}>
              <FlipHorizontal className="w-6 h-6" />
            </IconButton>
          )}
          
          <IconButton 
            onClick={toggleTorch}
            className={scannerState.torchOn ? 'bg-yellow-100/20' : ''}
          >
            <Flashlight className="w-6 h-6" />
          </IconButton>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <IconButton as="span">
              <Image className="w-6 h-6" />
            </IconButton>
          </label>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative bg-black">
        {/* Always render the video element */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            !scannerState.hasPermission ? 'hidden' : ''
          }`}
          playsInline
          muted
        />

        {!scannerState.hasPermission ? (
          <div className="flex flex-col items-center justify-center h-full bg-yellow-50 p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">
              {scannerState.error || 'Camera permission is required to scan barcodes.'}
            </p>
            <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
            <button
              onClick={requestCameraAccess}
              className="px-6 py-3 bg-black text-yellow-50 rounded-xl font-medium 
                       hover:bg-gray-800 active:bg-gray-900 transition-colors"
            >
              Enable Camera
            </button>
          </div>
        ) : scannerState.error ? (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg max-w-md mx-auto mt-8">
            <div className="text-red-500 mb-4">
              <Camera className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600 text-center mb-4">{scannerState.error}</p>
            <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
            <button
              onClick={() => {
                setScannerState(prev => ({ ...prev, isScanning: true, error: null }));
                requestCameraAccess();
              }}
              className="w-full py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 
                       active:bg-gray-900 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                          w-64 h-64 border-2 border-yellow-50 rounded-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanBarcode className="w-12 h-12 text-yellow-50" />
              </div>
            </div>
            
            <div className="absolute bottom-24 left-0 right-0 text-center">
              <p className="text-yellow-50 text-sm font-medium px-4">
                {scannerState.isProcessing 
                  ? 'Processing barcode...' 
                  : 'Center the barcode within the frame'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </div>
  );
};

export default Scanner;