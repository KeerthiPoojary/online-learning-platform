const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Generate certificate for completed course
router.post('/generate', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id } = req.body;
        const student_id = req.user.id;

        // Check if course is completed
        const [enrollment] = await db.execute(
            'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? AND completed = true',
            [student_id, course_id]
        );

        if (enrollment.length === 0) {
            return res.status(400).json({ 
                message: 'Course not completed yet. Complete the course to get certificate.' 
            });
        }

        // Check if certificate already exists
        const [existingCert] = await db.execute(
            'SELECT * FROM certificates WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );

        if (existingCert.length > 0) {
            return res.json({ 
                message: 'Certificate already generated',
                certificate: existingCert[0]
            });
        }

        // Get course and student details
        const [courses] = await db.execute(`
            SELECT c.*, u.name as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id 
            WHERE c.id = ?
        `, [course_id]);

        const [students] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [student_id]
        );

        const course = courses[0];
        const student = students[0];

        // Generate unique certificate ID
        const certificateId = `CERT-${Date.now()}-${student_id}-${course_id}`;
        
        // Generate verification code
        const verificationCode = crypto.randomBytes(16).toString('hex');

        // Create certificates directory if not exists
        const certDir = path.join(__dirname, '../../certificates');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        // Generate PDF certificate
        const pdfPath = path.join(certDir, `${certificateId}.pdf`);
        await generateCertificatePDF(pdfPath, {
            studentName: student.name,
            courseName: course.title,
            courseLevel: course.level,
            instructorName: course.instructor_name,
            completionDate: new Date(),
            certificateId: certificateId,
            verificationCode: verificationCode
        });

        // Save certificate record to database
        const [result] = await db.execute(
            'INSERT INTO certificates (student_id, course_id, certificate_url, certificate_id, verification_code) VALUES (?, ?, ?, ?, ?)',
            [student_id, course_id, `/certificates/${certificateId}.pdf`, certificateId, verificationCode]
        );

        res.status(201).json({
            message: 'Certificate generated successfully',
            certificate: {
                id: result.insertId,
                certificateId: certificateId,
                downloadUrl: `/api/certificates/download/${certificateId}`,
                verificationCode: verificationCode,
                studentName: student.name,
                courseName: course.title
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download certificate
router.get('/download/:certificateId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { certificateId } = req.params;
        const student_id = req.user.id;

        // Get certificate details
        const [certificates] = await db.execute(
            'SELECT * FROM certificates WHERE certificate_id = ? AND student_id = ?',
            [certificateId, student_id]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const certificate = certificates[0];
        const pdfPath = path.join(__dirname, '../../certificates', `${certificateId}.pdf`);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: 'Certificate file not found' });
        }

        res.download(pdfPath, `${certificateId}.pdf`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all certificates for logged-in student
router.get('/my-certificates', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const student_id = req.user.id;

        const [certificates] = await db.execute(`
            SELECT c.*, cr.title as course_title, cr.thumbnail as course_thumbnail
            FROM certificates c
            JOIN courses cr ON c.course_id = cr.id
            WHERE c.student_id = ?
            ORDER BY c.issued_at DESC
        `, [student_id]);

        res.json({ certificates });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get certificate by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const user_id = req.user.id;
        const user_role = req.user.role;

        let query = `
            SELECT c.*, cr.title as course_title, u.name as student_name, u.email as student_email
            FROM certificates c
            JOIN courses cr ON c.course_id = cr.id
            JOIN users u ON c.student_id = u.id
            WHERE c.id = ?
        `;
        
        // If not admin, only show own certificates
        if (user_role !== 'admin') {
            query += ' AND c.student_id = ?';
            const [certificates] = await db.execute(query, [id, user_id]);
            return res.json({ certificate: certificates[0] || null });
        }
        
        const [certificates] = await db.execute(query, [id]);
        res.json({ certificate: certificates[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify certificate (public endpoint - no auth required)
router.get('/verify/:verificationCode', async (req, res) => {
    try {
        const db = req.db;
        const { verificationCode } = req.params;

        const [certificates] = await db.execute(`
            SELECT c.*, cr.title as course_title, u.name as student_name, 
                   u.email as student_email, cr.level as course_level
            FROM certificates c
            JOIN courses cr ON c.course_id = cr.id
            JOIN users u ON c.student_id = u.id
            WHERE c.verification_code = ?
        `, [verificationCode]);

        if (certificates.length === 0) {
            return res.status(404).json({ 
                valid: false, 
                message: 'Invalid certificate. Certificate not found.' 
            });
        }

        const certificate = certificates[0];
        
        // Check if certificate is expired (optional - set expiry date)
        const issuedDate = new Date(certificate.issued_at);
        const expiryDate = new Date(issuedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Valid for 1 year
        
        const isValid = new Date() <= expiryDate;

        res.json({
            valid: isValid,
            certificate: {
                studentName: certificate.student_name,
                studentEmail: certificate.student_email,
                courseName: certificate.course_title,
                courseLevel: certificate.course_level,
                issuedDate: certificate.issued_at,
                expiryDate: expiryDate,
                certificateId: certificate.certificate_id
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get certificate statistics (Admin only)
router.get('/admin/stats', verifyToken, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const db = req.db;

        // Total certificates issued
        const [totalCerts] = await db.execute(
            'SELECT COUNT(*) as total FROM certificates'
        );

        // Certificates by month
        const [monthlyCerts] = await db.execute(`
            SELECT 
                MONTH(issued_at) as month,
                YEAR(issued_at) as year,
                COUNT(*) as count
            FROM certificates 
            WHERE issued_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY YEAR(issued_at), MONTH(issued_at)
            ORDER BY year DESC, month DESC
        `);

        // Top courses with most certificates
        const [topCourses] = await db.execute(`
            SELECT 
                cr.title,
                COUNT(c.id) as certificate_count
            FROM certificates c
            JOIN courses cr ON c.course_id = cr.id
            GROUP BY c.course_id
            ORDER BY certificate_count DESC
            LIMIT 5
        `);

        // Recent certificates
        const [recentCerts] = await db.execute(`
            SELECT c.*, cr.title as course_title, u.name as student_name
            FROM certificates c
            JOIN courses cr ON c.course_id = cr.id
            JOIN users u ON c.student_id = u.id
            ORDER BY c.issued_at DESC
            LIMIT 10
        `);

        res.json({
            totalCertificates: totalCerts[0].total,
            monthlyCertificates: monthlyCerts,
            topCourses: topCourses,
            recentCertificates: recentCerts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Regenerate certificate (if lost)
router.post('/regenerate/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { courseId } = req.params;
        const student_id = req.user.id;

        // Check if certificate exists
        const [existingCert] = await db.execute(
            'SELECT * FROM certificates WHERE student_id = ? AND course_id = ?',
            [student_id, courseId]
        );

        if (existingCert.length === 0) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Delete old PDF file
        const oldPdfPath = path.join(__dirname, '../../certificates', `${existingCert[0].certificate_id}.pdf`);
        if (fs.existsSync(oldPdfPath)) {
            fs.unlinkSync(oldPdfPath);
        }

        // Generate new certificate
        const [courses] = await db.execute(`
            SELECT c.*, u.name as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id 
            WHERE c.id = ?
        `, [courseId]);

        const [students] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [student_id]
        );

        const course = courses[0];
        const student = students[0];

        const certificateId = existingCert[0].certificate_id;
        const newPdfPath = path.join(__dirname, '../../certificates', `${certificateId}.pdf`);

        await generateCertificatePDF(newPdfPath, {
            studentName: student.name,
            courseName: course.title,
            courseLevel: course.level,
            instructorName: course.instructor_name,
            completionDate: new Date(),
            certificateId: certificateId,
            verificationCode: existingCert[0].verification_code
        });

        res.json({
            message: 'Certificate regenerated successfully',
            downloadUrl: `/api/certificates/download/${certificateId}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Function to generate PDF certificate
async function generateCertificatePDF(pdfPath, data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margin: 50
        });

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Add border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .strokeColor('#3B82F6')
           .lineWidth(3)
           .stroke();

        // Add background pattern
        for (let i = 0; i < 20; i++) {
            doc.opacity(0.05)
               .circle(50 + (i * 70), 50 + (i * 40), 20)
               .fill('#3B82F6');
        }
        doc.opacity(1);

        // Add certificate title
        doc.fontSize(40)
           .fillColor('#1F2937')
           .font('Helvetica-Bold')
           .text('CERTIFICATE OF COMPLETION', { align: 'center' });

        doc.moveDown();

        // Add award text
        doc.fontSize(16)
           .fillColor('#4B5563')
           .font('Helvetica')
           .text('This certificate is proudly presented to', { align: 'center' });

        doc.moveDown();

        // Add student name
        doc.fontSize(32)
           .fillColor('#3B82F6')
           .font('Helvetica-Bold')
           .text(data.studentName, { align: 'center' });

        doc.moveDown();

        // Add completion text
        doc.fontSize(16)
           .fillColor('#4B5563')
           .font('Helvetica')
           .text('for successfully completing the course', { align: 'center' });

        doc.moveDown();

        // Add course name
        doc.fontSize(28)
           .fillColor('#1F2937')
           .font('Helvetica-Bold')
           .text(data.courseName, { align: 'center' });

        doc.moveDown(0.5);

        // Add course level
        doc.fontSize(14)
           .fillColor('#6B7280')
           .font('Helvetica')
           .text(`Level: ${data.courseLevel.toUpperCase()}`, { align: 'center' });

        doc.moveDown(2);

        // Add completion date and instructor
        const completionDate = new Date(data.completionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        doc.fontSize(12)
           .fillColor('#4B5563')
           .font('Helvetica')
           .text(`Date of Completion: ${completionDate}`, { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(12)
           .fillColor('#4B5563')
           .text(`Instructor: ${data.instructorName}`, { align: 'center' });

        doc.moveDown(1.5);

        // Add signature line
        doc.fontSize(10)
           .fillColor('#9CA3AF')
           .text('Authorized Signature', 350, doc.y + 20);

        doc.moveTo(350, doc.y + 15)
           .lineTo(550, doc.y + 15)
           .stroke();

        // Add certificate ID and verification code at bottom
        doc.fontSize(8)
           .fillColor('#9CA3AF')
           .text(`Certificate ID: ${data.certificateId}`, 50, doc.page.height - 50);
        
        doc.fontSize(8)
           .fillColor('#9CA3AF')
           .text(`Verification Code: ${data.verificationCode}`, doc.page.width - 200, doc.page.height - 50);

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
    });
}

module.exports = router;