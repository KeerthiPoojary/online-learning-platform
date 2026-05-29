const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

const createCourse = async (req, res) => {
    try {
        const courseData = {
            ...req.body,
            instructor_id: req.userId
        };
        
        const courseId = await Course.create(courseData);
        const course = await Course.findById(courseId);
        
        res.status(201).json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getCourses = async (req, res) => {
    try {
        const filters = {};
        
        if (req.query.category) filters.category = req.query.category;
        if (req.query.level) filters.level = req.query.level;
        
        // Students see only published courses
        if (req.user.role === 'student') {
            filters.is_published = true;
        }
        
        const courses = await Course.findAll(filters);
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if student has access
        if (req.user.role === 'student') {
            const isEnrolled = await Enrollment.isEnrolled(req.userId, req.params.id);
            if (!course.is_published && !isEnrolled) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && course.instructor_id !== req.userId) {
            return res.status(403).json({ message: 'Permission denied' });
        }
        
        const updated = await Course.update(req.params.id, req.body);
        
        if (updated) {
            const updatedCourse = await Course.findById(req.params.id);
            res.json(updatedCourse);
        } else {
            res.status(400).json({ message: 'Failed to update course' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && course.instructor_id !== req.userId) {
            return res.status(403).json({ message: 'Permission denied' });
        }
        
        const deleted = await Course.delete(req.params.id);
        
        if (deleted) {
            res.json({ message: 'Course deleted successfully' });
        } else {
            res.status(400).json({ message: 'Failed to delete course' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const enrollInCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const isEnrolled = await Enrollment.isEnrolled(req.userId, courseId);
        
        if (isEnrolled) {
            return res.status(400).json({ message: 'Already enrolled' });
        }
        
        await Enrollment.enroll(req.userId, courseId);
        
        res.json({ message: 'Successfully enrolled in course' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addLesson = async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && course.instructor_id !== req.userId) {
            return res.status(403).json({ message: 'Permission denied' });
        }
        
        const lessonData = {
            ...req.body,
            course_id: courseId
        };
        
        const lessonId = await Lesson.create(lessonData);
        const lesson = await Lesson.findById(lessonId);
        
        res.status(201).json(lesson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    addLesson
};