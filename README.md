# RawLens 📸

A comprehensive camera rental platform built with modern web technologies. RawLens provides a complete ecosystem for camera equipment rental, featuring user verification, real-time updates, digital contracts, and comprehensive administration tools.

## 🌟 Features

### 📱 User Experience
- **Modern Landing Page** - Responsive design with camera showcase and feature highlights
- **Smart Search & Filtering** - Advanced camera discovery with multiple filter options
- **Digital Rental Process** - Streamlined booking with integrated signature capture
- **Real-time Updates** - Live status tracking for rentals and user profiles
- **Mobile-First Design** - Optimized for all device sizes with Tailwind CSS v4

### 🔐 Security & Verification
- **Multi-Step KYC Process** - Government ID, selfie, and video verification
- **Secure File Management** - Encrypted storage with automatic cleanup
- **Role-Based Access Control** - User and admin permission systems
- **Appeal System** - Users can resubmit verification documents
- **Session Management** - Secure authentication with automatic cleanup

### 📋 Rental Management
- **Dynamic Pricing Tiers** - Flexible pricing based on rental duration
- **Digital Contracts** - Auto-generated PDF agreements with embedded signatures
- **Status Tracking** - Complete rental lifecycle management
- **Feedback System** - Post-rental rating and review collection
- **Inclusion Items** - Configurable accessories and equipment packages

### 👥 Administration Dashboard
- **User Management** - Comprehensive user verification and status control
- **Camera Inventory** - Full CRUD operations for camera equipment
- **Rental Oversight** - Application review and rental status management
- **Analytics & Reporting** - User activity and rental performance insights
- **Real-time Monitoring** - Live updates across all platform activities

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Tailwind CSS v4** - Utility-first CSS with custom design tokens
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing with protected routes

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Real-time Subscriptions** - Live data updates across the platform
- **Row Level Security** - Database-level access control
- **Edge Functions** - Serverless function execution

### File & Document Management
- **Supabase Storage** - Secure file storage with signed URLs
- **PDF Generation** - Dynamic contract creation with pdf-lib
- **Image Processing** - Optimized media handling and transformations
- **Digital Signatures** - Canvas-based signature capture

### Development Tools
- **ESLint** - Code quality and consistency
- **Modern JavaScript** - ES6+ features and async/await patterns
- **Component Architecture** - Reusable and maintainable UI components

## 🏗 Architecture

### Project Structure
```
src/
├── components/         # Reusable UI components
├── pages/             # Route-based page components
│   ├── admin/         # Administrative interfaces
│   └── user/          # User-facing pages
├── services/          # API and business logic
├── stores/            # State management
├── hooks/             # Custom React hooks
└── lib/               # Configuration and utilities
```

### Key Services
- **Authentication Service** - User registration, login, and session management
- **User Service** - Profile management and verification workflows
- **Camera Service** - Inventory management and availability tracking
- **Rental Service** - Booking lifecycle and status management
- **Storage Service** - File upload, download, and cleanup operations
- **PDF Service** - Contract generation and digital signature embedding

## 🚀 Key Capabilities

### For Users
- Browse and search camera inventory with detailed specifications
- Complete secure verification process with document upload
- Book equipment with flexible date selection and pricing
- Sign digital contracts and receive PDF copies
- Track rental status and provide feedback
- Manage profile and resubmit verification if needed

### For Administrators
- Review and approve user verification documents
- Manage complete camera inventory with pricing tiers
- Process rental applications and track equipment
- Monitor user activity and platform analytics
- Handle appeals and customer support requests

### Technical Highlights
- **Real-time Updates** - Instant synchronization across all user sessions
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Security First** - Comprehensive data protection and access controls
- **Scalable Architecture** - Built to handle growing user base and inventory
- **Performance Optimized** - Fast loading times and smooth interactions

## 🔒 Security Features

- End-to-end encryption for sensitive data
- Automatic document cleanup after verification
- Secure file storage with time-limited access
- Role-based access control throughout the application
- Session management with automatic cleanup on errors

## 📈 Business Benefits

- **Reduced Manual Work** - Automated verification and contract processes
- **Improved User Experience** - Streamlined booking and tracking
- **Enhanced Security** - Comprehensive verification and data protection
- **Scalable Operations** - Efficient management of growing inventory
- **Data-Driven Insights** - Analytics for business optimization

## 🎯 Perfect For

- Camera rental businesses looking to digitize operations
- Equipment rental companies seeking modern management tools
- Startups requiring secure user verification systems
- Businesses needing automated contract generation
- Companies wanting real-time operational dashboards

---

**Built with modern web technologies for reliability, security, and scalability.**
