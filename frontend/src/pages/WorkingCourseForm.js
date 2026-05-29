import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const WorkingCourseForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          description: description,
          instructor_id: user.id,
          price: 0,
          level: 'beginner'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Course created!');
        navigate('/instructor/dashboard');
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Working Course Form</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              required
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default WorkingCourseForm;