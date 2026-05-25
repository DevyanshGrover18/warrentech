import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

export default function AddCustomerModal({ isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        state: '',
        city: '',
        password: '',
    });
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch states when modal opens
            const fetchStates = async () => {
                try {
                    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`);
                    setStates(response.data);
                } catch (error) {
                    console.error('Error fetching states:', error);
                }
            };
            fetchStates();
        }
    }, [isOpen]);

    useEffect(() => {
        // Fetch cities when state changes
        const fetchCities = async (state) => {
            if (!state) {
                setCities([]);
                setFormData(prev => ({ ...prev, city: '' }));
                return;
            }
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/cities/${state}`);
                setCities(response.data);
            } catch (error) {
                console.error(`Error fetching cities for ${state}:`, error);
            }
        };
        fetchCities(formData.state);
    }, [formData.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave(formData);
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Customer</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 border border-gray-300 rounded-lg" required />
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="w-full p-2 border border-gray-300 rounded-lg" required />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email (Optional)" className="w-full p-2 border border-gray-300 rounded-lg" />
                        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address (Optional)" className="w-full p-2 border border-gray-300 rounded-lg" />
                        <select name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="">Select State (Optional)</option>
                            {states.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                        <select name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" disabled={!formData.state}>
                            <option value="">Select City (Optional)</option>
                            {cities.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                        <input type="text" name="plumberName" value={formData.plumberName} onChange={handleChange} placeholder="Plumber Name (Optional)" className="w-full p-2 border border-gray-300 rounded-lg" />
                        <input type="text" name="plumberPhone" value={formData.plumberPhone} onChange={handleChange} placeholder="Plumber Phone (Optional)" className="w-full p-2 border border-gray-300 rounded-lg" />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password (Optional)" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
