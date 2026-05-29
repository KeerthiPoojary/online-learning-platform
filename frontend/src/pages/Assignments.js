import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaDownload, FaUpload, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const Assignments = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    total_points: 100
  });

  useEffect(() => {
    fetchCourses();
    fetchAssignments();
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

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/assignments/instructor', { headers });
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`http://localhost:5000/api/assignments/${assignmentId}/submissions`, { headers });
      setSubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingAssignment) {
        await axios.put(`http://localhost:5000/api/assignments/${editingAssignment.id}`, formData, { headers });
        toast.success('Assignment updated');
      } else {
        await axios.post('http://localhost:5000/api/assignments/create', formData, { headers });
        toast.success('Assignment created');
      }
      setShowModal(false);
      resetForm();
      fetchAssignments();
    } catch (error) {
      toast.error('Failed to save assignment');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this assignment?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Assignment deleted');
      fetchAssignments();
    }
  };

  const handleGrade = async (submissionId, grade, feedback) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`http://localhost:5000/api/assignments/submissions/${submissionId}/grade`, { grade, feedback }, { headers });
      toast.success('Grade submitted');
      fetchSubmissions(submissionId);
    } catch (error) {
      toast.error('Failed to submit grade');
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      title: '',
      description: '',
      due_date: '',
      total_points: 100
    });
    setEditingAssignment(null);
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
          <h1 className="text-3xl font-bold">Assignment Management</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Create Assignment
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaUpload className="text-gray-400 text-6xl mx-auto mb-4" />
            <p className="text-gray-500">No assignments yet. Click "Create Assignment" to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      <p className="text-sm text-gray-500">Course: {assignment.course_title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingAssignment(assignment); setFormData(assignment); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                        <FaEdit /> Edit
                      </button>
                      <button onClick={() => handleDelete(assignment.id)} className="text-red-600 hover:text-red-800">
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 mb-3">{assignment.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
                    <span>Total Points: {assignment.total_points}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h2>
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
                <label className="block text-sm font-medium mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded-md p-2"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  required
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded-md p-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Points</label>
                  <input
                    type="number"
                    value={formData.total_points}
                    onChange={(e) => setFormData({...formData, total_points: parseInt(e.target.value)})}
                    className="w-full border rounded-md p-2"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingAssignment ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Assignments;