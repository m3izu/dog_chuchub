// index.js
require('dotenv').config();

const sendVerificationEmail = require('./emailVerification.js');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());
console.log('Email user:', process.env.EMAIL_USER);

const PORT = process.env.PORT || 10000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define User and Post schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  // New field for username. Users can update this later.
  username: { type: String, default: '' },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  profilePicture: { type: String, default: '' }
});

const User = mongoose.model('User', userSchema);

// in your postSchema
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imageUrl: String,
  caption: String,
  predictions: Object,
  likeCount: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // new
  timestamp: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

// Middleware to protect routes with JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization; // Expecting "Bearer <token>"
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

// Endpoint for user signup
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if a user with the provided email already exists.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    
    // Generate a verification token (expires in 1 day)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Save user (still unverified)
    await user.save();
    
    // Send verification email
    sendVerificationEmail(user.email, token);
    
    res.json({ message: 'User created. Please check your email to verify your account.' });
  } catch (error) {
    res.status(500).json({ message: 'Signup error', error });
  }
});


app.get('/api/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Verification token is missing.');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // Update the user to set isVerified to true
    await User.findByIdAndUpdate(userId, { isVerified: true });
    
    res.send('Your account has been verified. You can now log in.');
  } catch (error) {
    console.error('Verification error:', error);
    res.status(400).send('Invalid or expired token.');
  }
});

// Endpoint for user login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    // Check if email has been verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your account. Check your email for the verification link.' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error });
  }
});

// Setup multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint to create a post (requires authentication)
app.post('/api/posts', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Upload image to Cloudinary
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: 'upload.jpg' });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    const cloudResponse = await axios.post(cloudinaryUrl, form, {
      headers: form.getHeaders(),
    });
    const imageUrl = cloudResponse.data.secure_url;

    // Parse predictions (sent as a JSON string)
    const { caption, predictions } = req.body;
    const post = new Post({
      userId: req.userId,
      imageUrl,
      caption,
      predictions: JSON.parse(predictions),
    });
    await post.save();
    res.json({ message: 'Post created', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating post', error });
  }
});

// Public endpoint to fetch all posts
// Require auth to know who the current user is
app.get('/api/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ timestamp: -1 })
      .populate('userId', 'username profilePicture');

    // Map to include hasLiked for this user
    const result = posts.map(post => ({
      _id: post._id,
      userId: post.userId,
      imageUrl: post.imageUrl,
      caption: post.caption,
      predictions: post.predictions,
      likeCount: post.likeCount,
      hasLiked: post.likedBy.includes(req.userId),
      timestamp: post.timestamp,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error });
  }
});


// -----------------------------
// New Endpoint: Update Username
// -----------------------------
app.put('/api/updateUsername', authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ message: 'Username cannot be empty' });
  }
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { username: username.trim() },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Username updated', username: updatedUser.username });
  } catch (error) {
    res.status(500).json({ message: 'Error updating username', error });
  }
});

// Endpoint to like a post
// replace your existing POST /api/posts/:postId/like with this:
app.post('/api/posts/:postId/like', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    // Find post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // If user already liked, just return current state
    if (post.likedBy.includes(userId)) {
      return res.json({ likeCount: post.likeCount, hasLiked: true });
    }

    // Otherwise add to likedBy and increment
    post.likedBy.push(userId);
    post.likeCount += 1;
    await post.save();

    res.json({ likeCount: post.likeCount, hasLiked: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error liking post', error });
  }
});


// -----------------------------
// New Endpoint: Get User's Posts
// -----------------------------
app.get('/api/myPosts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId }).sort({ timestamp: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user posts', error });
  }
});

// Endpoint to fetch the current user's profile
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username profilePicture email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});


// Endpoint to update profile picture
app.put('/api/updateProfilePicture', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Upload the new profile picture to Cloudinary
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: 'profile.jpg' });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    const cloudResponse = await axios.post(cloudinaryUrl, form, {
      headers: form.getHeaders(),
    });
    const imageUrl = cloudResponse.data.secure_url;
    
    // Update the user's profilePicture field
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { profilePicture: imageUrl },
      { new: true }
    );
    
    res.json({ message: 'Profile picture updated', profilePicture: updatedUser.profilePicture });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile picture', error });
  }
});

// Endpoint to delete profile picture
app.delete('/api/deleteProfilePicture', authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { profilePicture: '' },
      { new: true }
    );
    res.json({ message: 'Profile picture deleted', profilePicture: updatedUser.profilePicture });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting profile picture', error });
  }
});



app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
