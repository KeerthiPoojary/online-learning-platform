import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaYoutube, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const CourseLessons = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    duration: 0,
    order_number: 0
  });

  useEffect(() => {
    if (courseId) {
      fetchCourseAndLessons();
    } else {
      toast.error('Invalid course ID');
      navigate('/instructor/dashboard');
    }
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch course details
      const courseRes = await axios.get(`http://localhost:5000/api/courses/${courseId}`, { headers });
      setCourse(courseRes.data);
      
      // Fetch lessons - CORRECT ENDPOINT
      const lessonsRes = await axios.get(`http://localhost:5000/api/courses/${courseId}/lessons`, { headers });
      setLessons(lessonsRes.data.lessons || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeID(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeID(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('Please enter lesson title');
      return;
    }
    if (!formData.video_url) {
      toast.error('Please enter YouTube URL');
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const lessonData = {
        course_id: parseInt(courseId),
        title: formData.title,
        description: formData.description || '',
        video_url: getYouTubeEmbedUrl(formData.video_url),
        duration: parseInt(formData.duration) || 0,
        order_number: parseInt(formData.order_number) || 0
      };
      
      console.log('Sending lesson data:', lessonData);
      
      let response;
      // CORRECT ENDPOINT - using /api/courses/lessons
      if (editingLesson) {
        response = await axios.put(`http://localhost:5000/api/courses/lessons/${editingLesson.id}`, lessonData, { headers });
        toast.success('Lesson updated successfully');
      } else {
        response = await axios.post('http://localhost:5000/api/courses/lessons', lessonData, { headers });
        toast.success('Lesson added successfully');
      }
      
      console.log('Response:', response.data);
      
      setShowModal(false);
      resetForm();
      fetchCourseAndLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        // CORRECT ENDPOINT
        await axios.delete(`http://localhost:5000/api/courses/lessons/${lessonId}`, { headers });
        toast.success('Lesson deleted successfully');
        fetchCourseAndLessons();
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to delete lesson');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      duration: 0,
      order_number: lessons.length + 1
    });
    setEditingLesson(null);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      duration: lesson.duration || 0,
      order_number: lesson.order_number || 0
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/instructor/dashboard')}
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-1"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Course Content</h1>
            <p className="text-gray-600 mt-1">{course?.title}</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Add Lesson
          </button>
        </div>
        
        {lessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaYoutube className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Yet</h3>
            <p className="text-gray-500">Click "Add Lesson" to start adding YouTube videos to your course.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-64 h-48 bg-gray-100 relative">
                    {lesson.video_url && getYouTubeThumbnail(lesson.video_url) ? (
                      <img 
                        src={getYouTubeThumbnail(lesson.video_url)} 
                        alt={lesson.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaYoutube className="text-red-500 text-5xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center opacity-90">
                        <FaYoutube className="text-white text-xl" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {index + 1}. {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-gray-600 text-sm mt-2">{lesson.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(lesson)}
                          className="text-blue-600 hover:text-blue-800 p-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(lesson.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Lesson Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Introduction to Python"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube URL *
                </label>
                <input
                  type="text"
                  required
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                </p>
              </div>
              
              {formData.video_url && extractYouTubeID(formData.video_url) && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeID(formData.video_url)}`}
                      title="YouTube video preview"
                      className="w-full h-full rounded"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What will students learn in this lesson?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 15"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="number"
                    value={formData.order_number}
                    onChange={(e) => setFormData({...formData, order_number: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Lesson sequence"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving ? 'Saving...' : (editingLesson ? 'Update Lesson' : 'Add Lesson')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CourseLessons;