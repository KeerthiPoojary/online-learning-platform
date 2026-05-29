-- Create Database
CREATE DATABASE IF NOT EXISTS learning_platform;
USE learning_platform;

-- Users Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
    profile_pic VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add bio column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add profile_pic column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic VARCHAR(255);

-- Categories Table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructor_id INT,
    category_id INT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    thumbnail VARCHAR(255),
    level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    total_duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Lessons Table
CREATE TABLE lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    title VARCHAR(200) NOT NULL,
    video_url VARCHAR(255),
    materials_url VARCHAR(255),
    duration INT DEFAULT 0,
    order_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Enrollments Table
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- Create forum_discussions table if not exists
CREATE TABLE IF NOT EXISTS forum_discussions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    user_id INT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Create forum_replies table if not exists
CREATE TABLE IF NOT EXISTS forum_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    discussion_id INT,
    user_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (discussion_id) REFERENCES forum_discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_discussion_id (discussion_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Add is_pinned column if not exists
ALTER TABLE forum_discussions ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add rejection_reason column if not exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add admin_response column to support_tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_response TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('open', 'in-progress', 'resolved') DEFAULT 'open',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id)
);

-- Quizzes Table
CREATE TABLE quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    passing_score INT DEFAULT 70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Quiz Questions Table
CREATE TABLE quiz_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT,
    question TEXT NOT NULL,
    option_a VARCHAR(255),
    option_b VARCHAR(255),
    option_c VARCHAR(255),
    option_d VARCHAR(255),
    correct_answer CHAR(1),
    points INT DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Quiz Results Table
CREATE TABLE quiz_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    quiz_id INT,
    score INT,
    passed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    amount DECIMAL(10, 2),
    payment_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Certificates Table
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    certificate_url VARCHAR(255),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE KEY unique_certificate (student_id, course_id)
);

-- Reviews Table
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE KEY unique_review (student_id, course_id)
);

-- Wishlist Table
CREATE TABLE wishlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist (student_id, course_id)
);

-- Live Classes Table
CREATE TABLE live_classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    title VARCHAR(200),
    instructor_id INT,
    meeting_link VARCHAR(255),
    scheduled_time DATETIME,
    duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- Assignments Table
CREATE TABLE assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    title VARCHAR(200),
    description TEXT,
    due_date DATETIME,
    total_points INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Assignment Submissions Table
CREATE TABLE assignment_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT,
    student_id INT,
    submission_url VARCHAR(255),
    grade INT,
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
);

-- Forum Discussions Table
CREATE TABLE forum_discussions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    user_id INT,
    title VARCHAR(200),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Forum Replies Table
CREATE TABLE forum_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    discussion_id INT,
    user_id INT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discussion_id) REFERENCES forum_discussions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT,
    receiver_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Notifications Table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support Tickets Table
CREATE TABLE support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    subject VARCHAR(200),
    message TEXT,
    status ENUM('open', 'in-progress', 'resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    passing_score INT DEFAULT 70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT,
    question TEXT NOT NULL,
    option_a VARCHAR(255),
    option_b VARCHAR(255),
    option_c VARCHAR(255),
    option_d VARCHAR(255),
    correct_answer CHAR(1),
    points INT DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Create quiz_results table
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    quiz_id INT,
    score INT,
    passed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Create lesson_progress table for tracking individual lesson completion
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    lesson_id INT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (student_id, lesson_id)
);

-- Insert Sample Data
INSERT INTO categories (name, description) VALUES 
('Programming', 'Learn programming languages and software development'),
('Web Development', 'Build modern websites and web applications'),
('Data Science', 'Learn data analysis and machine learning'),
('Business', 'Develop business and management skills');

INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@example.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Create Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_chat_messages_users ON chat_messages(sender_id, receiver_id);