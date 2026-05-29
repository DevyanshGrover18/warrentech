import { useState, useRef, useEffect, useContext } from 'react';
import { Camera, X, CheckCircle, Scan } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import QrScanner from 'qr-scanner';
import { AuthContext } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

function DealerQRScannerModal({ isOpen, onClose, onProductAssigned }) {
    const { user } = useContext(AuthContext);
    const [isScanning, setIsScanning] = useState(false);
    const [productDetails, setProductDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);

    const startCamera = async () => {
        try {
            if (videoRef.current) {
                qrScannerRef.current = new QrScanner(
                    videoRef.current,
                    (result) => {
                        try {
                            const data = JSON.parse(result.data);
                            if (data.serialNumber) {
                                fetchProductDetails(data.serialNumber);
                            } else {
                                fetchProductDetails(result.data);
                            }
                        } catch {
                            fetchProductDetails(result.data);
                        }
                    },
                    {
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                await qrScannerRef.current.start();
                setIsScanning(true);
            }
        } catch (error) {
            toast.error('Camera access denied');
        }
    };

    const stopCamera = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.destroy();
            qrScannerRef.current = null;
        }
        setIsScanning(false);
    };

    const fetchProductDetails = async (serialNumber) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/qr/${serialNumber}`);
            setProductDetails(response.data);
            stopCamera();
        } catch (error) {
            toast.error('Product not found');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            fetchProductDetails(manualInput.trim());
        }
    };

    const assignProduct = async () => {
        try {
            setLoading(true);
            const isSubDealer = user?.role === 'sub_dealer';
            const endpoint = isSubDealer 
                ? `${API_URL}/api/dealer-sub-dealer-products/assign-by-serial`
                : `${API_URL}/api/dealer/products/assign-by-serial`;
            
            const payload = { serialNumber: productDetails.serialNumber };
            if (isSubDealer) {
                payload.subDealerId = user.subDealer?._id;
            }

            await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            });
            toast.success('Product assigned successfully!');
            onProductAssigned?.();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign product');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        stopCamera();
        setProductDetails(null);
        setManualInput('');
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            setProductDetails(null);
            setManualInput('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 bg-opacity-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-lg font-semibold">Scan Product</h2>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {!productDetails ? (
                        <>
                            {/* Camera Section */}
                            <div className="text-center">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full rounded-lg"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-32 h-32 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                                                <Scan className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Manual Input */}
                            <div className="pt-2">
                                <h3 className="font-medium mb-2">Or enter manually:</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Serial number..."
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                                    />
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? '...' : 'Search'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Product Details */
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Product Details</h3>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Serial:</span>
                                    <span className="font-medium">{productDetails.serialNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Order ID:</span>
                                    <span className="font-medium">{productDetails.orderId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Category:</span>
                                    <span className="font-medium">{productDetails.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Model:</span>
                                    <span className="font-medium">{productDetails.model?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        productDetails.status === 'Completed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : productDetails.status === 'Dispatched'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {productDetails.status}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={assignProduct}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <CheckCircle className="h-5 w-5" />
                                )}
                                Assign to Me
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DealerQRScannerModal;
