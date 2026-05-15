import React from 'react';

export default function PermissionEditor({ accessControl, sections, handleAccessControlChange }) {
  return (
    <div className="p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-3 capitalize">{section}</h4>
            <div className="space-y-2">
              {['view', 'add', 'modify', 'delete', 'full'].map((permission) => (
                <label key={permission} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={accessControl?.[section]?.[permission] || false}
                    onChange={() => handleAccessControlChange(section, permission)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 capitalize">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
