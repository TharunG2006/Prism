# Prism - E2EE Messaging Platform

Prism is a state-of-the-art, end-to-end encrypted (E2EE) messaging platform built with Next.js, Express, and Socket.IO.

## Features
- **True End-to-End Encryption**: Messages are encrypted/decrypted only on the client side using the Web Crypto API.
- **Multicast Group Chat**: Secure group conversations with individual session key management.
- **File Sharing**: Encrypted file uploads and downloads.
- **Security Vault**: Secondary PIN protection for sensitive chat metadata.
- **Real-time Status**: Live online/offline tracking via Socket.IO.

## Tech Stack
- **Frontend**: Next.js (Tailwind CSS, Framer Motion, Lucide React)
- **Backend**: Node.js (Express, Socket.IO, Mongoose)
- **Database**: MongoDB Atlas
- **Storage**: Cloudinary (Encrypted Blobs)
- **Email**: Brevo/Gmail for verification codes

## Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Prism
```

### 2. Install Dependencies
```bash
# Frontend
cd client && npm install

# Backend
cd ../server && npm install
```

### 3. Environment Variables
Create `.env` files based on the `.example` files provided in both `client` and `server` directories.

### 4. Run the application
```bash
# Start Backend
cd server && npm run dev

# Start Frontend
cd client && npm run dev
```

## License
MIT
