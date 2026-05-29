import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState(0);
  const [level, setLevel] = useState('beginner');
  const [thumbnail, setThumbnail] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    const courseData = {
      title: title,
      description: description,
      instructor_id: user.id,
      price: Number(price),
      level: level
    };
    
    if (categoryId && categoryId !== '') {
      courseData.category_id = Number(categoryId);
    }
    
    if (thumbnail && thumbnail !== '') {
      courseData.thumbnail = thumbnail;
    }
    
    console.log('Creating course:', courseData);
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Course created successfully!');
        navigate('/instructor/dashboard');
      } else {
        toast.error(data.message || 'Failed to create course');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/instructor/dashboard')}
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
        
        <h1 className="text-2xl font-bold mb-6">Create New Course</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Instructor Info */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                Creating course as: <strong>{JSON.parse(localStorage.getItem('user') || '{}').name}</strong>
              </span>
            </div>
          </div>
          
          {/* Course Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter course title"
            />
          </div>
          
          {/* Category Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a Category --</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Loading categories...</p>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows="5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter course description"
            />
          </div>
          
          {/* Level and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Thumbnail URL - Optional */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/course-image.jpg"
            />
            {thumbnail && (
              <div className="mt-2">
                <img 
                  src={thumbnail} 
                  alt="Preview" 
                  className="h-32 w-auto object-cover rounded border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const msg = document.createElement('p');
                    msg.className = 'text-red-500 text-xs mt-1';
                    msg.textContent = 'Invalid image URL';
                    e.target.parentNode.appendChild(msg);
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Form Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/instructor/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Course'
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateCourse;