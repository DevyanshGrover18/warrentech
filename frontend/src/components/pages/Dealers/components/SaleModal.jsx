import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios'; // Import axios

const API_URL = import.meta.env.VITE_API_URL; // Define API_URL

const SaleModal = ({ isOpen, onClose, productSelection, onSale }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [plumberName, setPlumberName] = useState('');
  const [plumberPhone, setPlumberPhone] = useState('');
  const [soldBy, setSoldBy] = useState('');
  const [states, setStates] = useState([]); // State for fetched states
  const [cities, setCities] = useState([]); // State for fetched cities

  // Reset form fields when modal opens or productSelection changes
  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerState('');
      setCustomerCity('');
      setPlumberName('');
      setPlumberPhone('');
      setSoldBy('');
    }
  }, [isOpen, productSelection]);

  // Fetch states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/locations/states`);
        setStates(response.data);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  // Fetch cities when customerState changes
  useEffect(() => {
    const fetchCities = async () => {
      if (customerState) {
        try {
          const response = await axios.get(`${API_URL}/api/locations/cities/${customerState}`);
          setCities(response.data);
          setCustomerCity(''); // Reset city when state changes
        } catch (error) {
          console.error(`Error fetching cities for ${customerState}:`, error);
        }
      } else {
        setCities([]);
        setCustomerCity('');
      }
    };
    fetchCities();
  }, [customerState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSale({ customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone, soldBy, productSelection });
    onClose();
  };

  if (!isOpen) return null;

  const productsToDisplay = Array.isArray(productSelection) ? productSelection : [productSelection];

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-full pt-4 px-4 pb-20 text-center sm:block sm:p-0 bg-black/70">
        <span className="hidden sm:inline-block sm:align-middle sm:h-full" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Sell Products</h3>
                <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-2">Products to Sell ({productsToDisplay.length} groups):</p>
                <ul className='bg-gray-100 rounded-lg p-3 max-h-32 overflow-y-auto'>
                  {productsToDisplay.map(group => (
                    <li key={group._id} className="text-sm text-gray-700 mb-1">
                      <strong>{group.productName}</strong>: {group.productsInBox.map(p => p.serialNumber).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className="mt-4">
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
                <input type="text" name="customerName" id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" required />
              </div>
              <div className="mt-4">
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Customer Phone</label>
                <input type="text" name="customerPhone" id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" required />
              </div>
              <div className="mt-4">
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">Customer Email</label>
                <input type="email" name="customerEmail" id="customerEmail" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" />
              </div>
              <div className="mt-4">
                <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700">Customer Address</label>
                <input type="text" name="customerAddress" id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" />
              </div>
              <div className="mt-4">
                <label htmlFor="customerState" className="block text-sm font-medium text-gray-700">Customer State</label>
                <select name="customerState" id="customerState" value={customerState} onChange={(e) => setCustomerState(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2">
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700">Customer City</label>
                <select name="customerCity" id="customerCity" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" disabled={!customerState}>
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label htmlFor="plumberName" className="block text-sm font-medium text-gray-700">Plumber Name</label>
                <input type="text" name="plumberName" id="plumberName" value={plumberName} onChange={(e) => setPlumberName(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" />
              </div>
              <div className="mt-4">
                <label htmlFor="plumberPhone" className="block text-sm font-medium text-gray-700">Plumber Phone</label>
                <input type="text" name="plumberPhone" id="plumberPhone" value={plumberPhone} onChange={(e) => setPlumberPhone(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" />
              </div>
              <div className="mt-4">
                <label htmlFor="soldBy" className="block text-sm font-medium text-gray-700">Sold By</label>
                <input type="text" name="soldBy" id="soldBy" value={soldBy} onChange={(e) => setSoldBy(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-2" />
              </div>
            </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Confirm Sale</button>
              <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;
