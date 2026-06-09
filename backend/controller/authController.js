const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Helper
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          profileCompleted: user.profileCompleted,
          skills: user.skills,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If logging in standard way, but user originally signed up via Google and has no password
    if (!user.password) {
      return res.status(400).json({ message: 'Please log in using Google authentication' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profileCompleted: user.profileCompleted,
        skills: user.skills,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Google OAuth sign-in / sign-up
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;

    // Check if user exists by email or googleId
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // If user exists but doesn't have googleId linked yet (signed up with email first)
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        await user.save();
      }
    } else {
      // Create user if logging in for the first time
      user = await User.create({
        name,
        email,
        googleId,
        avatar: avatar || '',
      });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profileCompleted: user.profileCompleted,
        skills: user.skills,
      },
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(400).json({ message: 'Google authentication failed. Invalid token.' });
  }
};

// @desc    GitHub OAuth sign-in / sign-up
// @route   POST /api/auth/github
// @access  Public
exports.githubLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'GitHub authorization code is required' });
    }

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token exchange error:', tokenData.error);
      return res.status(400).json({ message: `GitHub OAuth failed: ${tokenData.error_description || tokenData.error}` });
    }

    const { access_token } = tokenData;

    if (!access_token) {
      return res.status(400).json({ message: 'GitHub access token not received' });
    }

    // 2. Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'User-Agent': 'HackBuddy-App',
      },
    });

    const githubUser = await userResponse.json();

    if (!githubUser.id) {
      return res.status(400).json({ message: 'Failed to retrieve GitHub user info' });
    }

    const githubId = String(githubUser.id);
    let email = githubUser.email;
    const name = githubUser.name || githubUser.login;
    const avatar = githubUser.avatar_url;

    // 3. If email is not public, fetch user emails list
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'HackBuddy-App',
        },
      });
      const emailsList = await emailResponse.json();
      if (Array.isArray(emailsList) && emailsList.length > 0) {
        // Find primary verified email or fallback to first one
        const primaryEmail = emailsList.find((e) => e.primary && e.verified) || emailsList[0];
        email = primaryEmail?.email;
      }
    }

    if (!email) {
      // If we still don't have an email, generate a fallback email using github ID
      email = `${githubUser.login || githubId}@github.hackbuddy.com`;
    }

    // 4. Check if user already exists in DB
    let user = await User.findOne({ $or: [{ email }, { githubId }] });

    if (user) {
      // If user exists but githubId isn't linked yet, link it
      if (!user.githubId) {
        user.githubId = githubId;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        await user.save();
      }
    } else {
      // Create a new user in DB
      user = await User.create({
        name,
        email,
        githubId,
        avatar: avatar || '',
      });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profileCompleted: user.profileCompleted,
        skills: user.skills,
      },
    });
  } catch (error) {
    console.error('GitHub Auth error:', error);
    res.status(500).json({ message: 'GitHub authentication failed. Server error.' });
  }
};

