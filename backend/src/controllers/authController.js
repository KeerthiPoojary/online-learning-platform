const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { username, email, password, full_name, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create user
        const userId = await User.create({
            username,
            email,
            password,
            full_name,
            role: role || 'student'
        });
        
        const user = await User.findById(userId);
        const token = generateToken(userId);
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isPasswordValid = await User.comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = generateToken(user.id);
        const userData = await User.findById(user.id);
        
        res.json({
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, avatar_url, password } = req.body;
        const updateData = {};
        
        if (full_name) updateData.full_name = full_name;
        if (avatar_url) updateData.avatar_url = avatar_url;
        if (password) updateData.password = password;
        
        const updated = await User.update(req.userId, updateData);
        
        if (updated) {
            const user = await User.findById(req.userId);
            res.json({ message: 'Profile updated successfully', user });
        } else {
            res.status(400).json({ message: 'Failed to update profile' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, getProfile, updateProfile };