'use client'

import { useState } from 'react'

interface NavbarProps {
  currentView: 'upload' | 'orders' | 'contact'
  onViewChange: (view: 'upload' | 'orders' | 'contact') => void
  ordersCount: number
}

export default function Navbar({ currentView, onViewChange, ordersCount }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="dark-navbar sticky top-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => onViewChange('upload')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">📸 PhotoPrint UAE</h1>
              <p className="text-sm text-gray-400">Professional printing service</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => onViewChange('upload')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'upload'
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => onViewChange('orders')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentView === 'orders'
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
              }`}
            >
              <span>Orders</span>
              {ordersCount > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {ordersCount}
                </span>
              )}
            </button>
            
            {/* Additional Nav Items */}
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-teal-400 transition-colors">Pricing</a>
              <a href="#" className="hover:text-teal-400 transition-colors">Support</a>
              <button 
                onClick={() => onViewChange('contact')}
                className="accent-gradient px-4 py-2 rounded-lg text-white font-medium hover:shadow-lg transition-all duration-200"
              >
                Contact
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
            <div className="flex flex-col space-y-2 mt-4">
              <button
                onClick={() => {
                  onViewChange('upload')
                  setIsMenuOpen(false)
                }}
                className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                  currentView === 'upload'
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
                }`}
              >
                Upload Photos
              </button>
              <button
                onClick={() => {
                  onViewChange('orders')
                  setIsMenuOpen(false)
                }}
                className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 flex items-center justify-between ${
                  currentView === 'orders'
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
                }`}
              >
                <span>My Orders</span>
                {ordersCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    {ordersCount}
                  </span>
                )}
              </button>
              <div className="border-t border-gray-700 pt-2 mt-2">
                <a href="#" className="block px-4 py-2 text-gray-400 hover:text-teal-400 transition-colors">Pricing</a>
                <a href="#" className="block px-4 py-2 text-gray-400 hover:text-teal-400 transition-colors">Support</a>
                <button 
                  onClick={() => {
                    onViewChange('contact')
                    setIsMenuOpen(false)
                  }}
                  className="w-full mt-2 accent-gradient px-4 py-2 rounded-lg text-white font-medium"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}