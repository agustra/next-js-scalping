"use client";
import React, { useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

export const SettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleSettings}
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.84146 1.25C8.84146 0.835786 9.17725 0.5 9.59146 0.5H10.4085C10.8227 0.5 11.1585 0.835786 11.1585 1.25V2.02924C11.6329 2.17644 12.0823 2.38338 12.4976 2.64141L13.0355 2.10355C13.3284 1.81066 13.8033 1.81066 14.0962 2.10355L14.8962 2.90355C15.1891 3.19645 15.1891 3.67132 14.8962 3.96421L14.3586 4.50207C14.6166 4.91735 14.8236 5.36674 14.9708 5.84146H15.75C16.1642 5.84146 16.5 6.17725 16.5 6.59146V7.40854C16.5 7.82275 16.1642 8.15854 15.75 8.15854H14.9708C14.8236 8.63326 14.6166 9.08265 14.3586 9.49793L14.8962 10.0358C15.1891 10.3287 15.1891 10.8036 14.8962 11.0965L14.0962 11.8965C13.8033 12.1893 13.3284 12.1893 13.0355 11.8965L12.4976 11.3586C12.0823 11.6166 11.6329 11.8236 11.1585 11.9708V12.75C11.1585 13.1642 10.8227 13.5 10.4085 13.5H9.59146C9.17725 13.5 8.84146 13.1642 8.84146 12.75V11.9708C8.36674 11.8236 7.91735 11.6166 7.50207 11.3586L6.96421 11.8965C6.67132 12.1893 6.19645 12.1893 5.90355 11.8965L5.10355 11.0965C4.81066 10.8036 4.81066 10.3287 5.10355 10.0358L5.64141 9.49793C5.38338 9.08265 5.17644 8.63326 5.02924 8.15854H4.25C3.83579 8.15854 3.5 7.82275 3.5 7.40854V6.59146C3.5 6.17725 3.83579 5.84146 4.25 5.84146H5.02924C5.17644 5.36674 5.38338 4.91735 5.64141 4.50207L5.10355 3.96421C4.81066 3.67132 4.81066 3.19645 5.10355 2.90355L5.90355 2.10355C6.19645 1.81066 6.67132 1.81066 6.96421 2.10355L7.50207 2.64141C7.91735 2.38338 8.36674 2.17644 8.84146 2.02924V1.25ZM10 8.5C9.17157 8.5 8.5 9.17157 8.5 10C8.5 10.8284 9.17157 11.5 10 11.5C10.8284 11.5 11.5 10.8284 11.5 10C11.5 9.17157 10.8284 8.5 10 8.5ZM7 10C7 8.34315 8.34315 7 10 7C11.6569 7 13 8.34315 13 10C13 11.6569 11.6569 13 10 13C8.34315 13 7 11.6569 7 10Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Settings Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 w-64 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-900 dark:border-gray-800">
          <div className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Pengaturan
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notifikasi
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mode Gelap
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Suara
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <hr className="my-3 border-gray-200 dark:border-gray-700" />
            
            <button className="w-full px-3 py-2 text-sm text-left text-gray-700 rounded hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Preferensi Akun
            </button>
            <button className="w-full px-3 py-2 text-sm text-left text-gray-700 rounded hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Keamanan
            </button>
            <button className="w-full px-3 py-2 text-sm text-left text-gray-700 rounded hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Bantuan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};