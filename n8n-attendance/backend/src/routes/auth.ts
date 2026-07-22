import express from 'express';
import { userService } from '../services/userService';
import { authenticateToken } from '../middleware/auth';
import { LoginRequest, RegisterRequest } from '../types/user';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role }: RegisterRequest = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await userService.register({ email, password, firstName, lastName, role });
    
    res.status(201).json({
      message: 'User registered successfully',
      ...result
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.message === 'User already exists with this email') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await userService.login(email, password);
    
    res.json({
      message: 'Login successful',
      ...result
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const token = userService.generateToken(user);
    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;