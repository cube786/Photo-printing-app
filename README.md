# Photo Printing Web Application Demo

A modern, mobile-friendly photo printing web application built with Next.js, TypeScript, and Tailwind CSS. This demo showcases the core functionality of a photo printing service where users can upload photos, select print sizes, and place orders.


 **Photo Upload**: Upload up to 5 photos directly from mobile devices or desktop  
 **Thumbnail Preview**: Display uploaded photos as thumbnails  
 **Print Size Selection**: Choose from 4×6, 5×7, and 8×10 print sizes  
 **Automatic Price Calculation**: Real-time price calculation based on selected sizes  
 **Mock Payment**: Test "Pay Now" button with order summary  
 **Mobile-Friendly Design**: Responsive design optimized for mobile devices  

## Pricing

- 4×6 prints: AED 1.5
- 5×7 prints: AED 3.0
- 8×10 prints: AED 5.0

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **React Hooks**: useState, useRef for state management
- **File API**: Browser File API for photo uploads and preview


## Key Components

- **PhotoPrintingApp**: Main component handling photo upload, size selection, and payment
- **Photo Upload**: File input with validation and preview generation
- **Size Selector**: Dropdown component for print size selection
- **Price Calculator**: Real-time price calculation based on selected sizes
- **Order Summary**: Mock payment confirmation and order details

## Technical Highlights

- **Type Safety**: Full TypeScript implementation with proper type definitions
- **Memory Management**: Proper cleanup of object URLs to prevent memory leaks
- **Responsive Design**: Mobile-first approach using Tailwind CSS
- **User Experience**: Intuitive interface with clear feedback and validation
- **Performance**: Optimized with Next.js static generation and image optimization


