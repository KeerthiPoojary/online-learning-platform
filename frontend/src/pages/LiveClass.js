import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaVideo, FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const LiveClass = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    meeting_link: '',
    scheduled_time: '',
    duration: 60
  });

  useEffect(() => {
    fetchCourses();
    fetchLiveClasses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/instructor/courses', { headers });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchLiveClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/live-classes/instructor', { headers });
      setLiveClasses(response.data.liveClasses || []);
    } catch (error) {
      console.error('Error fetching live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingClass) {
        await axios.put(`http://localhost:5000/api/live-classes/${editingClass.id}`, formData, { headers });
        toast.success('Live class updated');
      } else {
        await axios.post('http://localhost:5000/api/live-classes/create', formData, { headers });
        toast.success('Live class scheduled');
      }
      setShowModal(false);
      resetForm();
      fetchLiveClasses();
    } catch (error) {
      toast.error('Failed to save live class');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this live class?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/live-classes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Live class deleted');
      fetchLiveClasses();
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      title: '',
      meeting_link: '',
      scheduled_time: '',
      duration: 60
    });
    setEditingClass(null);
  };

  const joinMeeting = (link) => {
    window.open(link, '_blank');
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Live Classes</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Schedule Live Class
          </button>
        </div>

        {liveClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaVideo className="text-gray-400 text-6xl mx-auto mb-4" />
            <p className="text-gray-500">No live classes scheduled. Click "Schedule Live Class" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveClasses.map((liveClass) => (
              <div key={liveClass.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white">
                  <FaVideo className="text-3xl mb-2" />
                  <h3 className="font-semibold text-lg">{liveClass.title}</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-2">Course: {liveClass.course_title}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <FaCalendarAlt /> <span>{new Date(liveClass.scheduled_time).toLocaleDateString()}</span>
                    <FaClock /> <span>{new Date(liveClass.scheduled_time).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Duration: {liveClass.duration} minutes</p>
                  <div className="flex justify-between gap-2">
                    <button
                      onClick={() => joinMeeting(liveClass.meeting_link)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <FaVideo /> Join Class
                    </button>
                    <button
                      onClick={() => { setEditingClass(liveClass); setFormData(liveClass); setShowModal(true); }}
                      className="text-blue-600 hover:text-blue-800 p-2"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(liveClass.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingClass ? 'Edit Live Class' : 'Schedule Live Class'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Course *</label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Class Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded-md p-2"
                  placeholder="e.g., Introduction to Python"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Meeting Link (Zoom/Google Meet) *</label>
                <input
                  type="url"
                  required
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({...formData, meeting_link: e.target.value})}
                  className="w-full border rounded-md p-2"
                  placeholder="https://zoom.us/j/123456789"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    className="w-full border rounded-md p-2"
                    min="15"
                    step="15"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingClass ? 'Update' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LiveClass;