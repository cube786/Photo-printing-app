'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Navbar from '@/components/Navbar'

type PrintSize = '4x6' | '5x7' | '8x10'
type PhotoWithSize = {
  id: string
  file?: File
  url: string
  size: PrintSize
  cloudinaryUrl?: string
}

type CompletedOrder = {
  id: string
  photos: {
    id: string
    cloudinaryUrl: string
    size: PrintSize
    price: number
  }[]
  total: number
  date: string
  status: 'completed'
}

const PRINT_PRICES: Record<PrintSize, number> = {
  '4x6': 1.5,
  '5x7': 3,
  '8x10': 5,
}



function PhotoPrintingApp() {
  const [photos, setPhotos] = useState<PhotoWithSize[]>([])
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [currentView, setCurrentView] = useState<'upload' | 'orders' | 'contact'>('upload')
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([
    // Sample demo order to show the functionality
    {
      id: 'demo-order-001',
      photos: [
        {
          id: 'demo-photo-1',
          cloudinaryUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
          size: '4x6' as PrintSize,
          price: 1.5
        },
        {
          id: 'demo-photo-2',
          cloudinaryUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop',
          size: '5x7' as PrintSize,
          price: 3
        },
        {
          id: 'demo-photo-3',
          cloudinaryUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=300&fit=crop',
          size: '4x6' as PrintSize,
          price: 1.5
        },
        {
          id: 'demo-photo-4',
          cloudinaryUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
          size: '8x10' as PrintSize,
          price: 5
        },
        {
          id: 'demo-photo-5',
          cloudinaryUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
          size: '5x7' as PrintSize,
          price: 3
        }
      ],
      total: 14,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      status: 'completed'
    }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validatingOrders, setValidatingOrders] = useState(false)
  const validatedOnce = useRef(false)

  // If an image fails to load (e.g., deleted in Cloudinary), remove it from the order immediately
  const handleBrokenOrderImage = (orderId: string, photoId: string) => {
    setCompletedOrders(prev => {
      const next: CompletedOrder[] = []
      for (const o of prev) {
        if (o.id !== orderId) { next.push(o); continue }
        const remaining = o.photos.filter(p => p.id !== photoId)
        if (remaining.length > 0) {
          next.push({ ...o, photos: remaining })
        }
      }
      return next
    })
  }

  // Persist orders locally so they survive refreshes
  const ORDERS_KEY = 'pp.orders.v1'
  React.useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(ORDERS_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setCompletedOrders(parsed)
        }
      }
    } catch {}
  }, [])
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(completedOrders))
      }
    } catch {}
  }, [completedOrders])

  // Validate that Cloudinary images referenced by orders still exist; if not, clean them up.
  const validateOrders = async () => {
    if (validatingOrders) return
    setValidatingOrders(true)
    try {
      const cleaned: CompletedOrder[] = []
      let changed = false
      for (const ord of completedOrders) {
        const keptPhotos: typeof ord.photos = []
        for (const p of ord.photos) {
          const u = p.cloudinaryUrl
          if (u && u.includes('res.cloudinary.com')) {
            const sep = u.includes('?') ? '&' : '?'
            const bust = `${u}${sep}_cb=${Date.now()}`
            try {
              const res = await fetch(bust, { method: 'GET', cache: 'no-store' })
              if (res.ok) {
                keptPhotos.push(p)
              } else {
                changed = true
              }
            } catch {
              changed = true
            }
          } else {
            keptPhotos.push(p)
          }
        }
        if (keptPhotos.length > 0) {
          cleaned.push({ ...ord, photos: keptPhotos })
        } else {
          changed = true
        }
      }
      if (changed) setCompletedOrders(cleaned)
    } finally {
      setValidatingOrders(false)
    }
  }

  // Run validation once after initial orders load
  React.useEffect(() => {
    if (!validatedOnce.current) {
      validatedOnce.current = true
      if (completedOrders.length > 0) {
        void validateOrders()
      }
    }
  }, [completedOrders.length])

  // Also validate whenever user navigates to the Orders view
  React.useEffect(() => {
    if (currentView === 'orders' && completedOrders.length > 0) {
      void validateOrders()
    }
  }, [currentView])

  // Real Cloudinary upload function (now using SIGNED upload for reliability)
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    
    console.log('🔄 Starting Cloudinary upload...')
    console.log('Cloud name:', cloudName)
    console.log('File:', file.name, file.size, 'bytes')
    
    // If no cloud name is set, use local URL
    if (!cloudName || cloudName === 'your_actual_cloud_name' || cloudName === 'PUT_YOUR_CLOUD_NAME_HERE') {
      console.log('⚠️ Using local URL - Cloudinary not configured')
      return URL.createObjectURL(file)
    }
    
    try {
      // 1) Ask our server for a signature (do not expose API secret on client)
      const signRes = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'photo-printing-app' }),
      })
      if (!signRes.ok) {
        const t = await signRes.text()
        console.error('❌ Failed to get signature:', signRes.status, t)
        throw new Error('Failed to obtain upload signature')
      }
      const { signature, timestamp, apiKey: apiKeyFromServer, folder, cloudName: cloudNameFromServer } = await signRes.json()
      const effectiveApiKey = apiKeyFromServer ?? apiKey
      if (!effectiveApiKey) {
        throw new Error('Missing CLOUDINARY_API_KEY. Check server env config.')
      }
      const effectiveCloud = (cloudNameFromServer || cloudName || '').trim()
      if (!effectiveCloud) {
        throw new Error('Missing cloud name on client/server')
      }
      
      // 2) Build the form data for a SIGNED upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)
      formData.append('api_key', String(effectiveApiKey))
      if (folder) formData.append('folder', folder)
      
  let uploadHost = 'api.cloudinary.com'
  let uploadUrl = `https://${uploadHost}/v1_1/${effectiveCloud}/image/upload`
  console.log('📤 Uploading to:', uploadUrl)
      console.log('🧾 Using SIGNED upload with timestamp', timestamp)
  console.log('🌐 Cloud name:', effectiveCloud)
      
      // Log all form data for debugging (except not logging signature fully)
      console.log('📋 Form data contents:')
      for (let [key, value] of formData.entries()) {
        if (key === 'signature') {
          console.log('  signature: [redacted]')
          continue
        }
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }
      
      let response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })
      
      console.log('📥 Response status:', response.status, response.statusText)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Upload error response:', errorText)
        
        // Parse the error for better debugging
        try {
          const errorJson = JSON.parse(errorText)
          console.error('🔍 Parsed error:', errorJson)
          
          if (errorJson.error?.message?.includes('Unknown API key')) {
            console.error('💡 Signed upload tips:')
            console.error('   • Verify CLOUDINARY_API_KEY matches the one in Dashboard > API Keys')
            console.error('   • Ensure the signature was generated with the same API SECRET and timestamp')
            console.error('   • Check you are uploading to the correct cloud name:', effectiveCloud)
          }
          // If Cloudinary says the cloud name is invalid, try EU API host once
          if (errorJson.error?.message?.includes('Invalid cloud_name') && uploadHost === 'api.cloudinary.com') {
            try {
              uploadHost = 'api-eu.cloudinary.com'
              uploadUrl = `https://${uploadHost}/v1_1/${effectiveCloud}/image/upload`
              console.warn('↻ Retrying upload against EU endpoint:', uploadUrl)
              response = await fetch(uploadUrl, { method: 'POST', body: formData })
              console.log('📥 Retry response status:', response.status, response.statusText)
              if (response.ok) {
                const data = await response.json()
                console.log('✅ Upload successful (EU endpoint):', data.secure_url)
                return data.secure_url
              } else {
                const retryText = await response.text()
                console.error('❌ EU endpoint error response:', retryText)
              }
            } catch (retryErr) {
              console.error('EU retry failed:', retryErr)
            }
          }
        } catch (e) {
          console.error('Could not parse error JSON:', e)
        }
        
        // Try to suggest alternative solutions
        console.error('🔧 DEBUG SUGGESTIONS:')
        console.error('1. Confirm NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is correct')
        console.error('2. Confirm CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET exist on the server')
        console.error('3. Ensure your system clock is accurate (timestamp is part of the signature)')
        console.error('4. If behind a proxy, ensure it does not strip form fields')
        
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Upload successful:', data.secure_url)
      console.log('📊 Upload details:', {
        public_id: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes
      })
      
      return data.secure_url
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error)
      console.log('🔄 Falling back to local URL')
      // Fallback to local URL if upload fails
      return URL.createObjectURL(file)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)
    const newPhotos: PhotoWithSize[] = []
    const remainingSlots = 5 - photos.length

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(file)
          newPhotos.push({
            id: crypto.randomUUID(),
            file,
            url: URL.createObjectURL(file),
            cloudinaryUrl,
            size: '4x6', // default size
          })
        } catch (error) {
          console.error('Upload failed:', error)
        }
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])
    setIsUploading(false)
    
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
        // Only revoke if it's a blob URL
        if (photoToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(photoToRemove.url)
        }
      }
      return updated
    })
  }

  const calculateTotal = () => {
    return photos.reduce((total, photo) => total + PRINT_PRICES[photo.size], 0)
  }

  // Note: We no longer auto-load existing Cloudinary assets into the upload grid.
  // Orders persist via localStorage, and the upload area starts empty each session.

  const handlePayNow = () => {
    // Save order to completed orders
    const newOrder: CompletedOrder = {
      id: crypto.randomUUID(),
      photos: photos.map(photo => ({
        id: photo.id,
        cloudinaryUrl: photo.cloudinaryUrl || photo.url,
        size: photo.size,
        price: PRINT_PRICES[photo.size]
      })),
      total: calculateTotal(),
      date: new Date().toISOString(),
      status: 'completed'
    }
    
    setCompletedOrders(prev => [...prev, newOrder])
    setShowOrderSummary(true)
  }

  const resetOrder = () => {
    // Clean up object URLs
    photos.forEach(photo => URL.revokeObjectURL(photo.url))
    setPhotos([])
    setShowOrderSummary(false)
    setCurrentView('upload')
  }

  const deleteOrder = (orderId: string) => {
    setCompletedOrders(prev => prev.filter(order => order.id !== orderId))
  }

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  if (showOrderSummary) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <Navbar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          ordersCount={completedOrders.length} 
        />

  <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
          <div className="dark-card rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 accent-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Order Summary</h2>
              <p className="text-gray-300">Review your photo printing order</p>
            </div>
            
            <div className="space-y-4 mb-8">
              {photos.map((photo) => (
                <div key={photo.id} className="flex justify-between items-center py-4 px-6 glass-effect rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 relative rounded-lg overflow-hidden shadow-sm border border-gray-600">
                      <Image
                        src={photo.url}
                        alt="Photo thumbnail"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-white">Photo Print</p>
                      <p className="text-sm text-gray-300">Size: {photo.size}</p>
                    </div>
                  </div>
                  <span className="font-bold text-xl text-teal-400">AED {PRINT_PRICES[photo.size]}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-600 pt-6 mb-8">
              <div className="flex justify-between items-center text-2xl font-bold">
                <span className="text-white">Total:</span>
                <span className="text-teal-400">AED {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-linear-to-r from-emerald-900/50 to-green-900/50 border border-emerald-600 text-emerald-200 px-6 py-4 rounded-xl text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Payment Successful! (Mock)</span>
                </div>
                <p className="text-sm">Your order has been received and will be processed within 24 hours.</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('Switching to orders view')
                    setShowOrderSummary(false)
                    setCurrentView('orders')
                    // Clear the photos when viewing orders to prevent persistence bug
                    photos.forEach(photo => URL.revokeObjectURL(photo.url))
                    setPhotos([])
                  }}
                  className="w-full accent-gradient text-white py-4 px-6 rounded-xl hover:accent-hover transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  View My Orders
                </button>
                <button
                  onClick={resetOrder}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl transition-all duration-300 font-semibold text-lg border border-gray-600 hover:border-gray-500"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // My Orders View
  if (currentView === 'orders') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <Navbar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          ordersCount={completedOrders.length} 
        />

  <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">My Orders</h2>
              <p className="text-gray-300">View all your completed photo printing orders</p>
            </div>
            <button
              onClick={() => validateOrders()}
              disabled={validatingOrders}
              className={`px-4 py-2 rounded-lg border border-gray-600 text-sm ${validatingOrders ? 'bg-gray-700 text-gray-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'} transition-colors`}
              title="Re-check that Cloudinary images still exist"
            >
              {validatingOrders ? 'Refreshing…' : 'Refresh from Cloudinary'}
            </button>
          </div>

          {completedOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {completedOrders.map((order) => (
                <div key={order.id} className="dark-card rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-white">Order #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-gray-300">
                        {new Date(order.date).toLocaleDateString('en-AE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 text-sm rounded-full font-medium border border-emerald-600">
                        {order.status}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this order?')) {
                            deleteOrder(order.id)
                          }
                        }}
                        className="w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                        title="Delete Order"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    {expandedOrders.has(order.id) ? (
                      // Expanded view - show all photos
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {order.photos.map((photo) => (
                            <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden">
                              <img
                                src={photo.cloudinaryUrl}
                                alt="Order photo"
                                className="w-full h-full object-cover"
                                onError={() => handleBrokenOrderImage(order.id, photo.id)}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => toggleExpandOrder(order.id)}
                          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors duration-200"
                        >
                          Show Less
                        </button>
                      </div>
                    ) : (
                      // Collapsed view - show only first 3 photos
                      <div className="grid grid-cols-3 gap-2">
                        {order.photos.slice(0, 3).map((photo) => (
                          <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden">
                            <img
                              src={photo.cloudinaryUrl}
                              alt="Order photo"
                              className="w-full h-full object-cover"
                              onError={() => handleBrokenOrderImage(order.id, photo.id)}
                            />
                          </div>
                        ))}
                        {order.photos.length > 3 && (
                          <button
                            onClick={() => toggleExpandOrder(order.id)}
                            className="aspect-square bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center border border-gray-600 transition-colors duration-200 cursor-pointer"
                          >
                            <span className="text-gray-300 font-medium">+{order.photos.length - 3}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.photos.map((photo) => (
                      <div key={photo.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">Print {photo.size}</span>
                        <span className="font-medium text-white">AED {photo.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-600 pt-4 flex justify-between items-center">
                    <span className="font-bold text-lg text-white">Total: AED {order.total.toFixed(2)}</span>
                    <div className="flex items-center space-x-2 text-sm text-teal-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">No orders yet</h3>
              <p className="text-gray-300 mb-6">
                You haven't placed any orders yet. Start by uploading some photos!
              </p>
              <button
                onClick={() => setCurrentView('upload')}
                className="accent-gradient text-white px-8 py-3 rounded-xl hover:accent-hover transition-all duration-300 font-semibold"
              >
                Upload Photos
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Contact View
  if (currentView === 'contact') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <Navbar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          ordersCount={completedOrders.length} 
        />

  <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-xl text-gray-300">Get in touch with PhotoPrint UAE for all your printing needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Phone */}
            <div className="dark-card rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-linear-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Phone</h3>
              <p className="text-gray-300 mb-4">Call us directly for immediate assistance</p>
              <a 
                href="tel:+971565916778" 
                className="text-teal-400 hover:text-teal-300 font-semibold text-lg transition-colors duration-200"
              >
                +971 56 591 6778
              </a>
            </div>

            {/* Email */}
            <div className="dark-card rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-linear-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Email</h3>
              <p className="text-gray-300 mb-4">Send us your questions and requirements</p>
              <a 
                href="mailto:aneeshabdulrahman786@gmail.com" 
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors duration-200 break-all"
              >
                aneeshabdulrahman786@gmail.com
              </a>
            </div>

            {/* Address */}
            <div className="dark-card rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-linear-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Visit Us</h3>
              <p className="text-gray-300 mb-4">Come to our location for pickup and assistance</p>
              <p className="text-teal-400 font-semibold text-lg">
                Karama, Dubai<br />
                <span className="text-gray-300 text-sm font-normal">United Arab Emirates</span>
              </p>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="dark-card rounded-2xl shadow-lg p-8 mt-8">
            <h3 className="text-2xl font-semibold text-white mb-6 text-center">Why Choose PhotoPrint UAE?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">High Quality Prints</h4>
                  <p className="text-gray-300">Professional photo printing with premium materials and vibrant colors.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Fast Delivery</h4>
                  <p className="text-gray-300">Quick turnaround times with reliable home delivery across UAE.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Affordable Pricing</h4>
                  <p className="text-gray-300">Competitive rates with transparent pricing and no hidden fees.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">24/7 Support</h4>
                  <p className="text-gray-300">Round-the-clock customer support to help with your printing needs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Upload Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => setCurrentView('upload')}
              className="accent-gradient text-white px-8 py-3 rounded-xl hover:accent-hover transition-all duration-300 font-semibold"
            >
              Start Printing Photos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        ordersCount={completedOrders.length} 
      />
  <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="xl:col-span-2 dark-card rounded-3xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Photos</h2>
              <p className="text-gray-300">Select up to 5 photos for professional printing</p>
            </div>

            {/* Upload Area */}
            <div className="mb-8">
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={photos.length >= 5}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className={`
                  border-2 border-dashed border-teal-500/50 rounded-2xl p-12 text-center transition-all duration-300
                  ${photos.length >= 5 ? 'bg-gray-800/30 opacity-50' : 'hover:border-teal-400 hover:bg-teal-500/10 cursor-pointer'}
                `}>
                  <div className="w-16 h-16 accent-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isUploading ? 'Uploading...' : photos.length >= 5 ? 'Maximum photos reached' : 'Drop your photos here'}
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {isUploading ? 'Please wait while we upload your photos' : photos.length >= 5 ? 'Remove some photos to upload more' : 'or click to browse from your device'}
                  </p>
                  <div className="text-sm text-gray-400">
                    <span className="font-medium text-teal-400">{photos.length}/5</span> photos uploaded
                  </div>
                </div>
              </div>
            </div>

            {/* Photos Grid - Thumbnails Display */}
            {photos.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-6 text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Your Photos ({photos.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group glass-effect rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                      <div className="aspect-4/3 relative overflow-hidden">
                        <Image
                          src={photo.url}
                          alt="Uploaded photo"
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 flex items-center justify-center backdrop-blur-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Print Size & Price
                          </label>
                          <select
                            value={photo.size}
                            onChange={(e) => handleSizeChange(photo.id, e.target.value as PrintSize)}
                            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors bg-gray-700 text-gray-100 appearance-none cursor-pointer"
                            style={{ 
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            <option value="4x6">4×6 inches - AED 1.50</option>
                            <option value="5x7">5×7 inches - AED 3.00</option>
                            <option value="8x10">8×10 inches - AED 5.00</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-teal-400">
                            AED {PRINT_PRICES[photo.size]}
                          </span>
                          <span className="text-sm text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full border border-gray-600">
                            {photo.size}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No photos uploaded yet</h3>
                <p className="text-gray-400">
                  Upload your photos to start creating your print order
                </p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="xl:col-span-1">
            <div className="dark-card rounded-3xl shadow-2xl p-8 xl:sticky xl:top-32">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Order Summary
              </h3>

              {photos.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="flex justify-between items-center py-2 text-sm">
                        <span className="text-gray-300">Print {photo.size}</span>
                        <span className="font-semibold text-white">AED {PRINT_PRICES[photo.size]}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className="text-white">Total:</span>
                      <span className="text-teal-400">AED {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="text-sm text-gray-300 space-y-1">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Premium quality prints</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Free home delivery</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>24-hour processing</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePayNow}
                      className="w-full accent-gradient text-white py-4 px-6 rounded-xl hover:accent-hover transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      Pay Now (Mock Payment)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Your order summary will appear here after uploading photos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(PhotoPrintingApp), { ssr: false })
