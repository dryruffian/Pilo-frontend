import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { X, ScanBarcode, Camera } from "lucide-react";
import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/authContext';

function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const navigate = useNavigate();
  const { authenticatedRequest } = useAuth();

  // Check for camera permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        setIsScanning(true);
        // Clean up the stream
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Permission error:', err);
        setError('Camera permission is required to scan barcodes.');
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, []);

  const handleScan = useCallback(async (barcodeData) => {
    try {
      // First, try to fetch the product
      await authenticatedRequest('get', `/api/v1/barcode/${barcodeData}`);
      
      // If successful, add to scan history
      await authenticatedRequest('post', '/data/history/add', {
        productCode: barcodeData
      });

      // Navigate to product page
      navigate(`/product/${barcodeData}`);
    } catch (err) {
      console.error('Scan error:', err);
      if (err.response) {
        switch (err.response.status) {
          case 400:
            setError('Invalid barcode format');
            break;
          case 404:
            setError('Product not found');
            break;
          case 503:
            setError('Service temporarily unavailable');
            break;
          default:
            setError('Failed to fetch product information');
        }
      } else if (err.request) {
        setError('Network error - please check your connection');
      } else {
        setError('An unexpected error occurred');
      }
    }
  }, [authenticatedRequest, navigate]);

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      setIsScanning(true);
      setError(null);
    } catch (err) {
      setError('Failed to access camera. Please check your browser settings.');
      setHasPermission(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="relative bg-yellow-50 p-4 flex justify-between items-center border-b-2 border-black">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-yellow-100 rounded-full active:opacity-60 transition-opacity"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold">
          Scan Product
        </h1>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative">
        {!hasPermission ? (
          <div className="flex flex-col items-center justify-center h-full bg-yellow-50 p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">{error || 'Camera permission is required to scan barcodes.'}</p>
            <button
              onClick={requestCameraPermission}
              className="bg-black text-yellow-50 py-3 px-6 rounded-xl font-medium active:opacity-60 transition-opacity"
            >
              Enable Camera
            </button>
          </div>
        ) : isScanning ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarcodeScannerComponent
                width={window.innerWidth}
                height={window.innerHeight}
                onUpdate={(err, result) => {
                  if (result) {
                    setIsScanning(false);
                    handleScan(result.text);
                  }
                }}
                className="object-cover"
                onError={(err) => {
                  console.error('Scanner Error:', err);
                  setError('Failed to initialize scanner. Please try again.');
                  setIsScanning(false);
                }}
                torch={false}
              />
            </div>
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-yellow-50 rounded-2xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanBarcode className="w-12 h-12 text-yellow-50" />
                </div>
              </div>
              
              <div className="absolute bottom-[120px] left-0 right-0 text-center">
                <p className="text-yellow-50 text-sm font-medium px-4">
                  Center the barcode within the frame
                </p>
              </div>
            </div>
          </>
        ) : (
          // Error View
          <div className="flex-1 bg-yellow-50 overflow-auto">
            <div className="max-w-lg mx-auto p-4">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                <p className="font-medium">Error</p>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setIsScanning(true);
                    setError(null);
                  }}
                  className="mt-4 w-full bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium active:opacity-60 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Safe Area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </div>
  );
}

export default Scanner;