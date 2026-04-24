require('dotenv').config();
const dns = require('node:dns');

// Force Node to use Google DNS to resolve MongoDB SRV records
// This fixes the ECONNREFUSED error on many local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Environment-aware CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'capacitor://localhost',
  'http://localhost',
  process.env.FRONTEND_URL
].filter(Boolean).map(o => o.replace(/\/$/, "")); // Remove trailing slash if users accidentally add it

const io = socketio(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to our routes
app.set('socketio', io);

// Middleware
app.use(express.json());
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) 
    // or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      console.log("CORS Blocked for origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use('/api/', limiter);

const connectDB = require('./services/db');
const User = require('./models/User');

// Connect to MongoDB and reset all user statuses
(async () => {
  await connectDB();
  const result = await User.resetAllOnline();
  console.log(`Reset ${result.modifiedCount} stale online statuses`);
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', require('./routes/groups'));
app.use('/api/vault', require('./routes/vault'));

// Database Meta
console.log('MongoDB & Cloudinary Services Active');

// Socket.IO logic
require('./sockets/chat')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
