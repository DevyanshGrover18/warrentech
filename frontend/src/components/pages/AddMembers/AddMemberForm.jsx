import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { memberService } from './api';
import {
  accessControlSections,
  createEmptyAccessControl,
} from './accessControlConfig';

export default function AddMemberForm() {
  const [activeTab, setActiveTab] = useState('basicDetails');
  const [memberData, setMemberData] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
  });
  const [accessControl, setAccessControl] = useState(createEmptyAccessControl());
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberDataChange = (e) => {
    const { name, value } = e.target;
    setMemberData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleAccessControlChange = (section, permission) => {
    setAccessControl((prevControl) => {
      const newControl = { ...prevControl };
      
      const defaults = { view: false, add: false, modify: false, delete: false, full: false };
      const currentSection = { ...defaults, ...(newControl[section] || {}) };

      if (permission === 'full') {
        const isFull = !currentSection.full;
        newControl[section] = {
          view: isFull,
          add: isFull,
          modify: isFull,
          delete: isFull,
          full: isFull,
        };
      } else {
        const newPermissionState = !currentSection[permission];
        newControl[section] = {
          ...currentSection,
          [permission]: newPermissionState,
          full: false, // Toggling individual permission removes full control
        };

        // If any permission other than view is enabled, enable view
        if (newPermissionState && permission !== 'view') {
          newControl[section].view = true;
        }

        // If view is disabled, disable all other permissions
        if (!newPermissionState && permission === 'view') {
          newControl[section].add = false;
          newControl[section].modify = false;
          newControl[section].delete = false;
          newControl[section].full = false;
        }
      }
      return newControl;
    });
  };

  const handleNext = () => {
    if (!memberData.name || !memberData.phone || !memberData.username || !memberData.password) {
      toast.error('Please fill in all basic details.');
      return;
    }
    setActiveTab('privileges');
  };

  const handlePrevious = () => {
    setActiveTab('basicDetails');
  };

  const handleSubmit = async () => {
    try {
      if (!memberData.name || !memberData.phone || !memberData.username || !memberData.password) {
        toast.error('Please fill in all basic details.');
        setActiveTab('basicDetails');
        return;
      }

      setIsLoading(true);
      await memberService.createMember({
        ...memberData,
        accessControl: accessControl
      });

      setMemberData({
        name: '',
        phone: '',
        username: '',
        password: '',
      });
      setAccessControl(createEmptyAccessControl());
      setActiveTab('basicDetails');
      toast.success('Member added successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  const sections = accessControlSections;

  const tabClasses = (tabName) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg focus:outline-none transition-colors duration-200 ${
      activeTab === tabName
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
    }`;

  return (
    <div className="bg-white rounded-xl p-4 mb-6">
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('basicDetails')}
            className={tabClasses('basicDetails')}
          >
            Basic Details
          </button>
          <button
            onClick={() => setActiveTab('privileges')}
            className={tabClasses('privileges')}
          >
            Privileges
          </button>
        </nav>
      </div>

      {activeTab === 'basicDetails' && (
        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={memberData.name}
              onChange={handleMemberDataChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter member's full name"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={memberData.phone}
              onChange={handleMemberDataChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={memberData.username}
              onChange={handleMemberDataChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Choose a unique username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={memberData.password}
                onChange={handleMemberDataChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Set a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'privileges' && (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            Configure access permissions for this member across different dashboard sections.
          </p>
          <div className="overflow-x-auto bg-gray-50 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Modules
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Add
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Modify
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Delete
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Full Control
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sections.map((section) => (
                  <tr key={section} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </td>
                    {['view', 'add', 'modify', 'delete', 'full'].map((permission) => (
                      <td key={permission} className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={accessControl[section][permission]}
                          onChange={() => handleAccessControlChange(section, permission)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        {activeTab === 'privileges' && (
          <button
            onClick={handlePrevious}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Previous
          </button>
        )}
        {activeTab === 'basicDetails' && (
          <button
            onClick={handleNext}
            className="ml-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Next
          </button>
        )}
        {activeTab === 'privileges' && (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Member'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
