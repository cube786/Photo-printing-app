'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

type PrintSize = '4x6' | '5x7' | '8x10'
type PhotoWithSize = {
  id: string
  file: File
  url: string
  size: PrintSize
}

const PRINT_PRICES: Record<PrintSize, number> = {
  '4x6': 1.5,
  '5x7': 3,
  '8x10': 5,
}

export default function PhotoPrintingApp() {
  const [photos, setPhotos] = useState<PhotoWithSize[]>([])
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newPhotos: PhotoWithSize[] = []
    const remainingSlots = 5 - photos.length

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          size: '4x6', // default size
        })
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSizeChange = (photoId: string, newSize: PrintSize) => {
    setPhotos(prev =>
      prev.map(photo =>
        photo.id === photoId ? { ...photo, size: newSize } : photo
      )
    )
  }

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const updated = prev.filter(photo => photo.id !== photoId)
      // Clean up object URL to prevent memory leaks
      const photoToRemove = prev.find(photo => photo.id === photoId)
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.url)
      }
      return updated
    })
  }

  const calculateTotal = () => {
    return photos.reduce((total, photo) => total + PRINT_PRICES[photo.size], 0)
  }

  const handlePayNow = () => {
    setShowOrderSummary(true)
  }

  const resetOrder = () => {
    // Clean up object URLs
    photos.forEach(photo => URL.revokeObjectURL(photo.url))
    setPhotos([])
    setShowOrderSummary(false)
  }

  if (showOrderSummary) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Order Summary
          </h1>
          
          <div className="space-y-4 mb-6">
            {photos.map((photo) => (
              <div key={photo.id} className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 relative rounded overflow-hidden">
                    <Image
                      src={photo.url}
                      alt="Photo thumbnail"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-sm text-gray-600">Size: {photo.size}</span>
                </div>
                <span className="font-semibold">AED {PRINT_PRICES[photo.size]}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>AED {calculateTotal().toFixed(2)}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
              ✅ Payment Successful! (Mock)
            </div>
            <p className="text-sm text-gray-600 text-center">
              Your order has been received. You will receive a confirmation email shortly.
            </p>
            <button
              onClick={resetOrder}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            UAE Photo Printing Service
          </h1>
          <p className="text-gray-600 mt-2">Professional photo printing with home delivery across UAE</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8"">
        
        {/* Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Photos (Up to 5)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={photos.length >= 5}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            {photos.length}/5 photos uploaded
          </p>
        </div>

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Your Photos
            </h3>
            <div className="space-y-4">
              {photos.map((photo) => (
                <div key={photo.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="w-20 h-20 relative rounded overflow-hidden shrink-0">
                      <Image
                        src={photo.url}
                        alt="Uploaded photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="grow">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Print Size
                        </label>
                        <select
                          value={photo.size}
                          onChange={(e) => handleSizeChange(photo.id, e.target.value as PrintSize)}
                          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="4x6">4×6 (AED 1.5)</option>
                          <option value="5x7">5×7 (AED 3.0)</option>
                          <option value="8x10">8×10 (AED 5.0)</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-green-600">
                          AED {PRINT_PRICES[photo.size]}
                        </span>
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total and Pay Button */}
        {photos.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-800">
                Total:
              </span>
              <span className="text-xl font-bold text-green-600">
                AED {calculateTotal().toFixed(2)}
              </span>
            </div>
            <button
              onClick={handlePayNow}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
            >
              Pay Now (Mock)
            </button>
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Upload photos to get started with your print order
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
