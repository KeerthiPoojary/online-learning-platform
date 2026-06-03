import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const SimpleCourseForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    const courseData = {
      title: title,
      description: description,
      instructor_id: user.id,
      price: 0,
      level: 'beginner'
    };
    
    console.log('Submitting:', courseData);
    setSaving(true);
    
    try {
      const response = await axios.post(
  'https://online-learning-platform-99mm.onrender.com/api/courses',
  courseData,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
      console.log('Response:', response.data);
      toast.success('Course created!');
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Simple Course Form (Test)</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Course Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md p-2"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md p-2"
              rows="4"
              required
            />
          </div>
          
          <div className="mb-4 p-2 bg-gray-100 rounded">
            Instructor ID: {JSON.parse(localStorage.getItem('user') || '{}').id}
          </div>
          
          <button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            {saving ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default SimpleCourseForm;