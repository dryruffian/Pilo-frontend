import { useCallback, useState, useEffect, useRef } from 'react';
import { X, ScanBarcode, Camera, Flashlight, FlipHorizontal, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/authContext';
import BarcodeDetectorPolyfill from 'barcode-detector-polyfill';
import PropTypes from 'prop-types';

// Separate IconButton component with prop validation
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
  supportedFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
  scanDelay = 500,
  maxRetries = 3,
  enableImageUpload = true,
  enableTorch = true,
  customErrorMessages = {}
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastScanRef = useRef(0);
  
  const [scannerState, setScannerState] = useState({
    isScanning: false,
    hasPermission: false,
    isProcessing: false,
    torchOn: false,
    error: null,
    debugMessage: '',
    isIOS: false,
    isScannerSupported: false
  });
  
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const navigate = useNavigate();
  const { authenticatedRequest } = useAuth();

  // Check browser compatibility
  useEffect(() => {
    const checkCompatibility = async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      setScannerState(prev => ({ 
        ...prev, 
        isIOS,
        isScannerSupported: hasMediaDevices
      }));

      if (!hasMediaDevices) {
        setScannerState(prev => ({
          ...prev,
          error: customErrorMessages.unsupportedBrowser || 'Your browser does not support barcode scanning'
        }));
        return;
      }
    };

    checkCompatibility();
  }, [customErrorMessages.unsupportedBrowser]);

  // Initialize detector with error handling and retries
  useEffect(() => {
    const initializeDetector = async () => {
      const initWithRetry = async (retriesLeft) => {
        try {
          if ('BarcodeDetector' in window) {
            const formats = await BarcodeDetector.getSupportedFormats();
            const supportedFormatsList = supportedFormats.filter(format => 
              formats.includes(format)
            );
            
            if (supportedFormatsList.length === 0) {
              throw new Error('No supported barcode formats available');
            }
            
            detectorRef.current = new BarcodeDetector({
              formats: supportedFormatsList
            });
          } else {
            detectorRef.current = new BarcodeDetectorPolyfill({
              formats: supportedFormats
            });
          }

          setScannerState(prev => ({
            ...prev,
            debugMessage: 'Detector initialized successfully'
          }));
        } catch (err) {
          console.error('Detector initialization error:', err);
          
          if (retriesLeft > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return initWithRetry(retriesLeft - 1);
          }
          
          setScannerState(prev => ({
            ...prev,
            error: customErrorMessages.initializationError || 'Failed to initialize barcode detector',
            debugMessage: `Init failed: ${err.message}`
          }));
        }
      };

      await initWithRetry(maxRetries);
    };

    initializeDetector();

    return () => {
      cleanup();
    };
  }, [supportedFormats, maxRetries, customErrorMessages.initializationError]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Enhanced camera loading with proper error handling
  useEffect(() => {
    const loadCameras = async () => {
      try {
        if (!scannerState.isScannerSupported) return;

        let devices = await navigator.mediaDevices.enumerateDevices();
        
        // Handle iOS permissions
        if (scannerState.isIOS && devices.length === 0) {
          await navigator.mediaDevices.getUserMedia({ video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
        }

        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);

        if (videoDevices.length > 0) {
          const defaultCamera = scannerState.isIOS 
            ? videoDevices.find(device => device.label.toLowerCase().includes('back')) || videoDevices[0]
            : videoDevices[0];
          setSelectedCamera(defaultCamera.deviceId);
        } else {
          throw new Error('No cameras found');
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
        setScannerState(prev => ({
          ...prev,
          error: customErrorMessages.cameraError || 'Failed to find cameras',
          debugMessage: `Camera enum failed: ${err.message}`
        }));
      }
    };

    loadCameras();
  }, [scannerState.isIOS, scannerState.isScannerSupported, customErrorMessages.cameraError]);

  // Enhanced scanning with rate limiting and error handling
  const startScanning = useCallback(() => {
    if (!videoRef.current || !detectorRef.current || scannerState.isProcessing) return;

    const scan = async () => {
      if (!videoRef.current || !scannerState.isScanning) return;

      const now = Date.now();
      if (now - lastScanRef.current < scanDelay) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        
        for (const barcode of barcodes) {
          if (barcode.rawValue && isValidBarcode(barcode.rawValue)) {
            lastScanRef.current = now;
            await handleBarcodeDetected(barcode.rawValue);
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(scan);
      } catch (error) {
        console.error('Scanning error:', error);
        retryCountRef.current++;
        
        if (retryCountRef.current > maxRetries) {
          setScannerState(prev => ({
            ...prev,
            error: customErrorMessages.scanningError || 'Failed to scan barcode',
            isScanning: false
          }));
          onScanError?.(error);
        } else {
          animationFrameRef.current = requestAnimationFrame(scan);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  }, [scannerState.isScanning, scannerState.isProcessing, scanDelay, maxRetries, onScanError, customErrorMessages.scanningError]);

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

      cleanup();
      onScanSuccess?.(barcode, productResponse.data);
      navigate(`/product/${barcode}`);
    } catch (err) {
      setScannerState(prev => ({
        ...prev,
        isProcessing: false,
        isScanning: false,
        error: getErrorMessage(err)
      }));
      onScanError?.(err);
    }
  };

  // Enhanced camera access request with better error handling
  const requestCameraAccess = async () => {
    try {
      setScannerState(prev => ({ 
        ...prev, 
        debugMessage: 'Requesting camera access...',
        error: null 
      }));

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      cleanup();

      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: scannerState.isIOS ? 640 : 1280 },
          height: { ideal: scannerState.isIOS ? 480 : 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      if (scannerState.isIOS) {
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
      }

      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          videoElement.play()
            .then(resolve)
            .catch(reject);
        };
      });

      setScannerState(prev => ({
        ...prev,
        hasPermission: true,
        isScanning: true,
        error: null,
        debugMessage: 'Camera started successfully'
      }));

      retryCountRef.current = 0;
      startScanning();
    } catch (err) {
      console.error('Camera access error:', err);
      setScannerState(prev => ({
        ...prev,
        hasPermission: false,
        error: customErrorMessages.permissionError || 'Failed to access camera. Please check permissions.',
        debugMessage: `Access failed: ${err.message}`
      }));
      onScanError?.(err);
    }
  };

  const isValidBarcode = (barcode) => {
    const barcodeRegex = /^[0-9]{8,14}$/;
    return barcodeRegex.test(barcode);
  };

  const getErrorMessage = (error) => {
    if (error.message === 'Invalid barcode format') {
      return customErrorMessages.invalidBarcode || 'Invalid barcode format detected';
    }
    if (error.response) {
      const status = error.response.status;
      const messages = {
        400: customErrorMessages.invalidFormat || 'Invalid barcode format',
        404: customErrorMessages.productNotFound || 'Product not found',
        503: customErrorMessages.serviceUnavailable || 'Service temporarily unavailable',
      };
      return messages[status] || customErrorMessages.fetchError || 'Failed to fetch product information';
    }
    return error.request 
      ? (customErrorMessages.networkError || 'Network error - please check your connection')
      : (customErrorMessages.unexpectedError || 'An unexpected error occurred');
  };

  const toggleTorch = async () => {
    if (!enableTorch) return;
    
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track.getCapabilities().torch) {
          await track.applyConstraints({
            advanced: [{ torch: !scannerState.torchOn }]
          });
          setScannerState(prev => ({ ...prev, torchOn: !prev.torchOn }));
        }
      }
    } catch (err) {
      console.error('Torch toggle error:', err);
    }
  };

  const switchCamera = async () => {
    const currentIndex = cameras.findIndex(camera => camera.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].deviceId);
    await requestCameraAccess();
  };

  const handleImageUpload = async (event) => {
    if (!enableImageUpload) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    try {
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
      setScannerState(prev => ({
        ...prev,
        error: customErrorMessages.imageUploadError || 'Could not detect barcode in image'
      }));
      onScanError?.(err);
    } finally {
      // Clear the input to allow uploading the same file again
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
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
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            !scannerState.hasPermission ? 'hidden' : ''
          }`}
          playsInline
          muted
        />

        {!scannerState.isScannerSupported ? (
          <div className="flex flex-col items-center justify-center h-full bg-yellow-50 p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">
              {scannerState.error || 'Your browser does not support barcode scanning.'}
            </p>
            <p className="text-xs text-gray-500 mb-4">{scannerState.debugMessage}</p>
          </div>
        ) : !scannerState.hasPermission ? (
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

      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </div>
  );
};

// Prop validation
Scanner.propTypes = {
  // Required callbacks
  onScanSuccess: PropTypes.func,
  onScanError: PropTypes.func,
  
  // Optional configuration
  supportedFormats: PropTypes.arrayOf(PropTypes.oneOf([
    'aztec', 'code_128', 'code_39', 'code_93', 'codabar', 'data_matrix',
    'ean_13', 'ean_8', 'itf', 'pdf417', 'qr_code', 'upc_a', 'upc_e'
  ])),
  scanDelay: PropTypes.number,
  maxRetries: PropTypes.number,
  enableImageUpload: PropTypes.bool,
  enableTorch: PropTypes.bool,
  
  // Custom error messages
  customErrorMessages: PropTypes.shape({
    unsupportedBrowser: PropTypes.string,
    initializationError: PropTypes.string,
    cameraError: PropTypes.string,
    permissionError: PropTypes.string,
    scanningError: PropTypes.string,
    invalidBarcode: PropTypes.string,
    invalidFormat: PropTypes.string,
    productNotFound: PropTypes.string,
    serviceUnavailable: PropTypes.string,
    fetchError: PropTypes.string,
    networkError: PropTypes.string,
    unexpectedError: PropTypes.string,
    imageUploadError: PropTypes.string
  })
};

// Default props
Scanner.defaultProps = {
  supportedFormats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
  scanDelay: 500,
  maxRetries: 3,
  enableImageUpload: true,
  enableTorch: true,
  customErrorMessages: {},
  onScanSuccess: () => {},
  onScanError: () => {}
};

export default Scanner;