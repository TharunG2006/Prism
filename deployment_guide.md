# 🚀 Prism Deployment Guide

This guide covers the steps to deploy your E2EE platform to production. Because Prism uses **WebSockets (Socket.IO)** for real-time messaging, we must split the deployment:
1.  **Frontend**: Vercel (Optimized for Next.js)
2.  **Backend**: Railway.app or Render.com (Optimized for WebSockets)

---

## 1. Backend Deployment (Railway.app)
Vercel is great for websites, but it doesn't support persistent WebSockets. You need a host like Railway for the server.

### Steps:
1.  **Go to [Railway.app](https://railway.app/)** and connect your GitHub repo.
2.  **Select the `server` directory** as the root.
3.  **Add your Environment Variables** in the Railway dashboard:
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `JWT_SECRET`: A long random string.
    *   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
    *   `FRONTEND_URL`: `https://your-prism-app.vercel.app` (You'll get this from Vercel).
4.  **Deploy**. Railway will give you a domain like `prism-production.up.railway.app`.

---

## 2. Frontend Deployment (Vercel)

### Steps:
1.  **Go to [Vercel.com](https://vercel.com/)** and "Add New Project".
2.  **Connect your GitHub repo** and select the `client` directory.
3.  **Root Directory**: Set this to `client`.
4.  **Add Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: `https://your-railway-domain.up.railway.app`
5.  **Deploy**. Vercel will launch your site.

---

## 3. Post-Deployment Checklist

### ✅ MongoDB Whitelist
In **MongoDB Atlas**, go to Network Access and add `0.0.0.0/0` (Allow Access from Anywhere) so your Railway server can connect.

### ✅ CORS Sync
The `FRONTEND_URL` on Railway must match your Vercel address exactly for security.

### ✅ Verification
Open your Vercel link and test a chat. If the socket connects (online status appears), you are live!
