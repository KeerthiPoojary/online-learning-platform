const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Initialize Razorpay (you'll need to install razorpay: npm install razorpay)
// For now, we'll create a mock implementation

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Create a payment order
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, amount } = req.body;
        const student_id = req.user.id;

        // Check if course exists
        const [courses] = await db.execute('SELECT * FROM courses WHERE id = ?', [course_id]);
        if (courses.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        const [existingEnrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );
        if (existingEnrollment.length > 0) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        // Generate unique order ID
        const orderId = `ORDER_${Date.now()}_${student_id}_${course_id}`;
        
        // Create payment record
        const [payment] = await db.execute(
            'INSERT INTO payments (student_id, course_id, amount, payment_id, status) VALUES (?, ?, ?, ?, ?)',
            [student_id, course_id, amount, orderId, 'pending']
        );

        // Return order details
        res.json({
            success: true,
            orderId: orderId,
            amount: amount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_123456789',
            paymentId: payment.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Verify payment and complete enrollment
router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { orderId, paymentId, signature, course_id, amount } = req.body;
        const student_id = req.user.id;

        // Verify payment signature (for Razorpay)
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret')
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature !== signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // Start transaction
        await db.execute('START TRANSACTION');

        // Update payment status
        await db.execute(
            'UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE payment_id = ?',
            ['completed', paymentId, orderId]
        );

        // Enroll student in course
        await db.execute(
            'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
            [student_id, course_id]
        );

        await db.execute('COMMIT');

        res.json({
            success: true,
            message: 'Payment verified and enrollment successful'
        });
    } catch (error) {
        await req.db.execute('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get payment history for a student
router.get('/my-payments', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const student_id = req.user.id;

        const [payments] = await db.execute(`
            SELECT p.*, c.title as course_title, c.thumbnail
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE p.student_id = ?
            ORDER BY p.created_at DESC
        `, [student_id]);

        res.json({ payments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get payment details by ID
router.get('/:paymentId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { paymentId } = req.params;
        const user_id = req.user.id;
        const user_role = req.user.role;

        let query = `
            SELECT p.*, c.title as course_title, u.name as student_name, u.email as student_email
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            JOIN users u ON p.student_id = u.id
            WHERE p.id = ?
        `;
        
        // If not admin, only show own payments
        if (user_role !== 'admin') {
            query += ' AND p.student_id = ?';
            const [payments] = await db.execute(query, [paymentId, user_id]);
            return res.json({ payment: payments[0] || null });
        }
        
        const [payments] = await db.execute(query, [paymentId]);
        res.json({ payment: payments[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get payment statistics (Admin only)
router.get('/admin/stats', verifyToken, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const db = req.db;

        // Total revenue
        const [totalRevenue] = await db.execute(
            'SELECT SUM(amount) as total FROM payments WHERE status = "completed"'
        );

        // Monthly revenue for current year
        const [monthlyRevenue] = await db.execute(`
            SELECT 
                MONTH(created_at) as month,
                SUM(amount) as revenue,
                COUNT(*) as transaction_count
            FROM payments 
            WHERE status = 'completed' 
                AND YEAR(created_at) = YEAR(CURDATE())
            GROUP BY MONTH(created_at)
            ORDER BY month ASC
        `);

        // Recent transactions
        const [recentPayments] = await db.execute(`
            SELECT p.*, c.title as course_title, u.name as student_name
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            JOIN users u ON p.student_id = u.id
            WHERE p.status = 'completed'
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        res.json({
            totalRevenue: totalRevenue[0].total || 0,
            monthlyRevenue,
            recentPayments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Refund payment (Admin only)
router.post('/:paymentId/refund', verifyToken, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const db = req.db;
        const { paymentId } = req.params;
        const { reason } = req.body;

        // Start transaction
        await db.execute('START TRANSACTION');

        // Update payment status
        await db.execute(
            'UPDATE payments SET status = ?, refund_reason = ?, refunded_at = NOW() WHERE id = ?',
            ['refunded', reason, paymentId]
        );

        // Get enrollment details
        const [payment] = await db.execute(
            'SELECT student_id, course_id FROM payments WHERE id = ?',
            [paymentId]
        );

        if (payment.length > 0) {
            // Remove enrollment
            await db.execute(
                'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
                [payment[0].student_id, payment[0].course_id]
            );
        }

        await db.execute('COMMIT');

        res.json({
            success: true,
            message: 'Payment refunded and enrollment removed'
        });
    } catch (error) {
        await req.db.execute('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Webhook for payment gateway callbacks
router.post('/webhook', async (req, res) => {
    try {
        const db = req.db;
        const webhookData = req.body;
        
        // Verify webhook signature (implement based on your payment gateway)
        // For Razorpay webhook verification
        const razorpaySignature = req.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';
        
        // Verify signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(webhookData))
            .digest('hex');
        
        if (razorpaySignature !== expectedSignature) {
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }

        // Process webhook event
        const { event, payload } = webhookData;
        
        if (event === 'payment.captured') {
            const paymentId = payload.payment.entity.id;
            const orderId = payload.payment.entity.order_id;
            
            // Update payment status
            await db.execute(
                'UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE payment_id = ?',
                ['completed', paymentId, orderId]
            );
            
            // Get payment details
            const [payment] = await db.execute(
                'SELECT student_id, course_id FROM payments WHERE payment_id = ?',
                [orderId]
            );
            
            if (payment.length > 0) {
                // Enroll student
                await db.execute(
                    'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
                    [payment[0].student_id, payment[0].course_id]
                );
            }
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
});

// Check if user has purchased a course
router.get('/check-purchase/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { courseId } = req.params;
        const student_id = req.user.id;

        const [payment] = await db.execute(
            'SELECT id, status FROM payments WHERE student_id = ? AND course_id = ? AND status = "completed"',
            [student_id, courseId]
        );

        res.json({ 
            purchased: payment.length > 0,
            payment: payment[0] || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get instructor earnings (for instructors)
router.get('/instructor/earnings', verifyToken, async (req, res) => {
    try {
        // Check if instructor
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Instructor only.' });
        }

        const db = req.db;
        const instructor_id = req.user.id;

        // Get courses by this instructor
        const [courses] = await db.execute(
            'SELECT id, title, price FROM courses WHERE instructor_id = ?',
            [instructor_id]
        );

        let totalEarnings = 0;
        const courseEarnings = [];

        for (const course of courses) {
            // Count enrollments for this course
            const [enrollments] = await db.execute(
                'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
                [course.id]
            );
            
            const earnings = course.price * enrollments[0].count;
            totalEarnings += earnings;
            
            courseEarnings.push({
                ...course,
                enrollments: enrollments[0].count,
                earnings: earnings
            });
        }

        res.json({
            totalEarnings,
            courses: courseEarnings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;