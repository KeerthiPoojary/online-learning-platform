import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaChartLine, FaDollarSign, FaStar, FaBookOpen, FaUserGraduate, FaChalkboardTeacher, FaTags, FaCheck, FaTimes, FaEye, FaFilter, FaSearch, FaSpinner } from 'react-icons/fa';
import { Pie, Bar, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler, ArcElement
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0, totalStudents: 0, totalInstructors: 0,
    totalCourses: 0, totalRevenue: 0, totalEnrollments: 0,
    pendingCourses: 0, averageRating: 0
  });
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    title: '', description: '', category_id: '', instructor_id: '', 
    price: 0, level: 'beginner', thumbnail: '', status: 'approved' 
  });
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const API_BASE_URL = "https://online-learning-platform-99mm.onrender.com";

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, coursesRes, usersRes, categoriesRes, instructorsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/courses`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/categories`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/instructors`, { headers })
      ]);

      setStats(statsRes.data);
      setCourses(coursesRes.data.courses || []);
      setUsers(usersRes.data.users || []);
      setCategories(categoriesRes.data.categories || []);
      setInstructors(instructorsRes.data.instructors || []);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        toast.error('Unauthorized access');
      } else if (error.response?.status === 403) {
        toast.error('Admin privileges required');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const courseData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id || null,
        instructor_id: parseInt(formData.instructor_id),
        price: parseFloat(formData.price) || 0,
        level: formData.level,
        thumbnail: formData.thumbnail || '',
        status: formData.status
      };

      if (editingItem) {
        await axios.put(`${API_BASE_URL}/api/admin/courses/${editingItem.id}`, courseData, { headers });
        toast.success('Course updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/courses`, courseData, { headers });
        toast.success('Course created successfully');
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save course');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCategory) {
        await axios.put(`${API_BASE_URL}/api/admin/categories/${editingCategory.id}`, catForm, { headers });
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/categories`, catForm, { headers });
        toast.success('Category created successfully');
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      setCatForm({ name: '', description: '' });
      await loadData();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setProcessingAction(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', description: '', category_id: '', instructor_id: '', 
      price: 0, level: 'beginner', thumbnail: '', status: 'approved' 
    });
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');

      const endpoint = type === 'course'
        ? `${API_BASE_URL}/api/admin/courses/${id}`
        : `${API_BASE_URL}/api/admin/categories/${id}`;

      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${type} deleted successfully`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete ${type}`);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleApprove = async (courseId) => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');

      await axios.put(`${API_BASE_URL}/api/admin/approve-course/${courseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Course approved successfully');
      await loadData();
    } catch (error) {
      toast.error('Failed to approve course');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async (courseId) => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');

      await axios.put(`${API_BASE_URL}/api/admin/reject-course/${courseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Course rejected successfully');
      await loadData();
    } catch (error) {
      toast.error('Failed to reject course');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesFilter = courseFilter === 'all' || course.status === courseFilter;
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p>{title}</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</p>
        </div>
        <div style={{ background: color, padding: '12px', borderRadius: '12px', color: 'white' }}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', height: '400px' }}>
          <FaSpinner className="animate-spin" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h1>Admin Dashboard</h1>
      </div>
    </Layout>
  );
};

export default AdminDashboard;