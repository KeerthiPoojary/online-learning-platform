import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const CourseDetailsPage = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/courses/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Course not found</p>
          <Link to="/courses" className="text-blue-600 hover:underline mt-2 inline-block">Back to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to="/courses" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Courses</Link>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <img 
            src={course.thumbnail || 'https://via.placeholder.com/1200x400?text=Course+Banner'} 
            alt={course.title}
            className="w-full h-64 object-cover"
          />
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            <p className="text-gray-600 mb-4">by {course.instructor_name}</p>
            <p className="text-gray-700 mb-6">{course.description}</p>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-blue-600">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </span>
                <span className="text-gray-500">
                  ⭐ {course.avg_rating || 'No ratings yet'}
                </span>
              </div>
              <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                Enroll Now
              </button>
            </div>
            
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              {course.lessons && course.lessons.length > 0 ? (
                course.lessons.map((lesson, index) => (
                  <div key={lesson.id} className="mb-2 p-3 bg-gray-50 rounded hover:bg-gray-100">
                    <span className="font-medium">Lesson {index + 1}:</span> {lesson.title}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No lessons available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsPage;