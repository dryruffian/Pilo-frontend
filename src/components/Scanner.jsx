import { useCallback, useState, useEffect, useRef } from 'react';
import { X, ScanBarcode, Camera, Flashlight, FlipHorizontal, Image, Bug } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/authContext';
import BarcodeDetectorPolyfill from 'barcode-detector-polyfill';
import PropTypes from 'prop-types';

// IconButton component
const IconButton = ({ children, onClick, className = "", disabled = false, as = "button" }) => {
  const Component = as;
  return (
    <Component 
      onClick={disabled ? undefined : onClick}
      className={`p-2 rounded-full ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-yellow-100/10 active:bg-yellow-100/20'
      } transition-colors ${className}`}
      disabled={disabled}
    >
      {children}
    </Component>
  );
};

IconButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  as: PropTypes.oneOf(['button', 'span', 'div'])
};

const Scanner = ({ 
  onScanSuccess,
  onScanError,
  supportedFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e','itf','code_128','code_39',"code_93",'codabar'],
  scanDelay = 100,
  maxRetries = 3,
  enableImageUpload = true,
  enableTorch = true,
  debugMode = true
}) => {
  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastScanRef = useRef(0);
  
  // State
  const [scannerState, setScannerState] = useState({
    isScanning: false,
    hasPermission: false,
    isProcessing: false,
    torchOn: false,
    error: null,
    debugMessage: '',
    isIOS: false,
    isScannerSupported: false,
    detectedBarcodes: [],
    lastFrameProcessed: 0
  });
  
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  

  const navigate = useNavigate();
  const { authenticatedRequest } = useAuth();

 
  const debug = useCallback((message, data = null) => {
    if (debugMode) {
      console.log(`[Scanner Debug] ${message}`, data || '');
      setScannerState(prev => ({
        ...prev,
        debugMessage: `${message} ${data ? JSON.stringify(data) : ''}`
      }));
    }
  }, [debugMode]);

 
  const cleanup = useCallback(() => {
    debug('Cleaning up scanner resources');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        debug('Stopped track:', track.label);
      });
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [debug]);

  // Initialize detector
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        debug('Initializing barcode detector...');
        
        // Check for native support
        if ('BarcodeDetector' in window) {
          debug('Using native BarcodeDetector');
          const formats = await BarcodeDetector.getSupportedFormats();
          debug('Supported formats:', formats);
          
          detectorRef.current = new BarcodeDetector({
            formats: supportedFormats
          });
        } else {
          debug('Using BarcodeDetector polyfill');
          detectorRef.current = new BarcodeDetectorPolyfill({
            formats: supportedFormats
          });
        }

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        await detectorRef.current.detect(canvas);
        debug('Detector test successful');

        setScannerState(prev => ({
          ...prev,
          isScannerSupported: true
        }));

      } catch (err) {
        debug('Detector initialization failed:', err);
        setScannerState(prev => ({
          ...prev,
          error: 'Failed to initialize scanner. Please try reloading the page.',
          isScannerSupported: false
        }));
      }
    };

    initializeDetector();
    return () => cleanup();
  }, [supportedFormats, debug, cleanup]);

  // Load cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        debug('Enumerating devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        debug('Found video devices:', videoDevices);
        setCameras(videoDevices);

        if (videoDevices.length > 0) {
          // Prefer back camera on mobile
          const backCamera = videoDevices.find(
            device => device.label.toLowerCase().includes('back')
          );
          setSelectedCamera(backCamera?.deviceId || videoDevices[0].deviceId);
        }
      } catch (err) {
        debug('Failed to enumerate devices:', err);
        setScannerState(prev => ({
          ...prev,
          error: 'Failed to find cameras',
        }));
      }
    };

    if (scannerState.isScannerSupported) {
      loadCameras();
    }
  }, [scannerState.isScannerSupported, debug]);

  // Barcode validation
  const isValidBarcode = useCallback((barcode) => {
    const barcodeRegex = /^[0-9]{8,14}$/;
    return barcodeRegex.test(barcode);
  }, []);

  // Handle detected barcode
  const handleBarcodeDetected = async (barcode) => {
    if (scannerState.isProcessing) return;
    
    debug('Processing detected barcode:', barcode);
    setScannerState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      if (!isValidBarcode(barcode)) {
        throw new Error('Invalid barcode format');
      }

      debug('Fetching product data...');
      const productResponse = await authenticatedRequest('get', `/api/v1/barcode/${barcode}`);
      
      await authenticatedRequest('post', '/data/history/add', {
        productCode: barcode,
        timestamp: new Date().toISOString(),
        productData: productResponse.data
      });

      debug('Scan successful, cleaning up...');
      cleanup();
      onScanSuccess?.(barcode, productResponse.data);
      navigate(`/product/${barcode}`);
    } catch (err) {
      debug('Barcode processing error:', err);
      setScannerState(prev => ({
        ...prev,
        isProcessing: false,
        isScanning: false,
        error: err.message
      }));
      onScanError?.(err);
    }
  };

  // Scanning function
  const startScanning = useCallback(() => {
    if (!videoRef.current || !detectorRef.current || scannerState.isProcessing) {
      debug('Cannot start scanning - prerequisites not met');
      return;
    }

    const scan = async () => {
      if (!videoRef.current || !scannerState.isScanning) return;

      const now = Date.now();
      if (now - lastScanRef.current < scanDelay) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      try {
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          debug('Video not ready yet');
          animationFrameRef.current = requestAnimationFrame(scan);
          return;
        }

        debug('Processing frame');
        const barcodes = await detectorRef.current.detect(video);
        
        if (debugMode) {
          setScannerState(prev => ({
            ...prev,
            detectedBarcodes: barcodes,
            lastFrameProcessed: now
          }));
        }

        if (barcodes.length > 0) {
          debug('Barcodes detected:', barcodes);
          for (const barcode of barcodes) {
            if (barcode.rawValue && isValidBarcode(barcode.rawValue)) {
              debug('Valid barcode found:', barcode.rawValue);
              lastScanRef.current = now;
              await handleBarcodeDetected(barcode.rawValue);
              return;
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(scan);
      } catch (error) {
        debug('Scan error:', error);
        retryCountRef.current++;
        
        if (retryCountRef.current > maxRetries) {
          setScannerState(prev => ({
            ...prev,
            error: 'Scanner encountered an error. Please try again.',
            isScanning: false
          }));
          onScanError?.(error);
        } else {
          animationFrameRef.current = requestAnimationFrame(scan);
        }
      }
    };

    debug('Starting scan loop');
    animationFrameRef.current = requestAnimationFrame(scan);
  }, [
    scannerState.isScanning,
    scannerState.isProcessing,
    scanDelay,
    maxRetries,
    onScanError,
    debug,
    isValidBarcode,
  ]);


  // Camera access request
  const requestCameraAccess = async () => {
    try {
      debug('Requesting camera access...');
      
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      cleanup();

      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: 1920  },
          height: { ideal: 1080 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous',
          frameRate: { ideal: 60 },
          zoom: 1.5
        }
      };

      debug('Requesting stream with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('playsinline', 'true');
      
      debug('Waiting for video to be ready...');
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          videoElement.play()
            .then(() => {
              debug('Video playing successfully');
              resolve();
            })
            .catch(reject);
        };
      });

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities();
        debug('Camera capabilities:', capabilities);
        
        if (capabilities.focusMode?.includes('continuous')) {
          await track.applyConstraints({
            focusMode: 'continuous'
          });
        }
      }

      setScannerState(prev => ({
        ...prev,
        hasPermission: true,
        isScanning: true,
        error: null,
        debugMessage: 'Camera initialized successfully'
      }));

      retryCountRef.current = 0;
      startScanning();
    } catch (err) {
      debug('Camera access error:', err);
      setScannerState(prev => ({
        ...prev,
        hasPermission: false,
        error: 'Failed to access camera. Please check permissions and try again.',
        debugMessage: `Access failed: ${err.message}`
      }));
      onScanError?.(err);
    }
  };

  // Toggle torch
  const toggleTorch = async () => {
    if (!enableTorch) return;
    
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !scannerState.torchOn }]
          });
          setScannerState(prev => ({ ...prev, torchOn: !prev.torchOn }));
          debug('Torch toggled:', !scannerState.torchOn);
        }
      }
    } catch (err) {
      debug('Torch toggle error:', err);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    const currentIndex = cameras.findIndex(camera => camera.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].deviceId);
    await requestCameraAccess();
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      debug('Processing uploaded image...');
      
      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type');
      }

      const bitmap = await createImageBitmap(file);
      const barcodes = await detectorRef.current.detect(bitmap);
      
      if (barcodes.length > 0) {
        await handleBarcodeDetected(barcodes[0].rawValue);
      } else {
        throw new Error('No barcode found in image');
      }
    } catch (err) {
      debug('Image processing error:', err);
      setScannerState(prev => ({
        ...prev,
        error: 'Could not detect barcode in image'
      }));
      onScanError?.(err);
    } finally {
      event.target.value = '';
    }
  };

  // Render component
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
            <IconButton 
              onClick={switchCamera}
              disabled={!scannerState.hasPermission || scannerState.isProcessing}
            >
              <FlipHorizontal className="w-6 h-6" />
            </IconButton>
          )}
          
          {enableTorch && (
            <IconButton 
              onClick={toggleTorch}
              disabled={!scannerState.hasPermission || scannerState.isProcessing}
              className={scannerState.torchOn ? 'bg-yellow-100/20' : ''}
            >
              <Flashlight className="w-6 h-6" />
            </IconButton>
          )}
          
          {enableImageUpload && (
            <label className={`cursor-pointer ${(!scannerState.hasPermission || scannerState.isProcessing) ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={!scannerState.hasPermission || scannerState.isProcessing}
              />
              <IconButton 
                as="span"
                disabled={!scannerState.hasPermission || scannerState.isProcessing}
              >
                <Image className="w-6 h-6" />
              </IconButton>
            </label>
          )}
          
          {debugMode && (
            <IconButton 
              onClick={() => {
                debug('Current scanner state:', {
                  ...scannerState,
                  cameras: cameras.length,
                  selectedCamera,
                  videoReady: videoRef.current?.readyState,
                  streamActive: streamRef.current?.active
                });
              }}
            >
              <Bug className="w-6 h-6" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Scanner View */}
      <div className="flex-1 relative bg-black">
        {/* Video Element */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            !scannerState.hasPermission ? 'hidden' : ''
          }`}
          playsInline
          muted
        />

        {/* Initial State - No Permission */}
        {!scannerState.isScannerSupported ? (
          <div className="flex flex-col items-center justify-center h-full bg-yellow-50 p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">
              Your browser doesn&apos;t support barcode scanning.
              Please try using a modern browser.
            </p>
            {debugMode && (
              <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
            )}
          </div>
        ) : !scannerState.hasPermission ? (
          <div className="flex flex-col items-center justify-center h-full bg-yellow-50 p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">
              {scannerState.error || 'Camera permission is required to scan barcodes.'}
            </p>
            {debugMode && (
              <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
            )}
            <button
              onClick={requestCameraAccess}
              className="px-6 py-3 bg-black text-yellow-50 rounded-xl font-medium 
                       hover:bg-gray-800 active:bg-gray-900 transition-colors"
            >
              Enable Camera
            </button>
          </div>
        ) : scannerState.error ? (
          // Error State
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg max-w-md mx-auto mt-8">
            <div className="text-red-500 mb-4">
              <Camera className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600 text-center mb-4">{scannerState.error}</p>
            {debugMode && (
              <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
            )}
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
          // Active Scanner Overlay
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanning Frame */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                          w-64 h-64 border-2 border-yellow-50 rounded-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanBarcode className="w-12 h-12 text-yellow-50" />
              </div>
              
              {/* Scanning Animation */}
              <div 
                className="absolute left-0 right-0 h-0.5 bg-yellow-50/50"
                style={{
                  animation: 'scan 2s linear infinite',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
            </div>
            
            {/* Status Messages */}
            <div className="absolute bottom-24 left-0 right-0 text-center">
              <p className="text-yellow-50 text-sm font-medium px-4">
                {scannerState.isProcessing 
                  ? 'Processing barcode...' 
                  : 'Center the barcode within the frame'}
              </p>
              {debugMode && scannerState.detectedBarcodes.length > 0 && (
                <p className="text-yellow-50/60 text-xs px-4 mt-2">
                  Detected: {scannerState.detectedBarcodes.map(b => b.rawValue).join(', ')}
                </p>
              )}
              {debugMode && (
                <p className="text-yellow-50/60 text-xs px-4 mt-1">
                  {scannerState.debugMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />

      {/* CSS for scanning animation */}
      <style >{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          50.1% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// Prop Types
Scanner.propTypes = {
  onScanSuccess: PropTypes.func,
  onScanError: PropTypes.func,
  supportedFormats: PropTypes.arrayOf(PropTypes.string),
  scanDelay: PropTypes.number,
  maxRetries: PropTypes.number,
  enableImageUpload: PropTypes.bool,
  enableTorch: PropTypes.bool,
  debugMode: PropTypes.bool
};

// Default Props
Scanner.defaultProps = {
  supportedFormats: ['ean_13', 'ean_8', 'upc_a', 'upc_e','itf','code_128','code_39',"code_93",'codabar'],
  scanDelay: 100,
  maxRetries: 3,
  enableImageUpload: true,
  enableTorch: true,
  debugMode: false,
  onScanSuccess: () => {},
  onScanError: () => {}
};

export default Scanner;