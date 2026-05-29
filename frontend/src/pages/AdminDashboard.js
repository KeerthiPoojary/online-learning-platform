import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaChartLine, FaDollarSign, FaStar, FaBookOpen, FaUserGraduate, FaChalkboardTeacher, FaTags, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
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
  const [formData, setFormData] = useState({ 
    title: '', description: '', category_id: '', instructor_id: '', 
    price: 0, level: 'beginner', thumbnail: '', status: 'approved' 
  });
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, coursesRes, usersRes, categoriesRes, instructorsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/stats', headers),
        axios.get('http://localhost:5000/api/admin/courses', headers),
        axios.get('http://localhost:5000/api/admin/users', headers),
        axios.get('http://localhost:5000/api/admin/categories', headers),
        axios.get('http://localhost:5000/api/admin/instructors', headers)
      ]);
      
      setStats(statsRes.data);
      setCourses(coursesRes.data.courses || []);
      setUsers(usersRes.data.users || []);
      setCategories(categoriesRes.data.categories || []);
      setInstructors(instructorsRes.data.instructors || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const courseData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id || null,
        instructor_id: formData.instructor_id,
        price: parseFloat(formData.price) || 0,
        level: formData.level,
        thumbnail: formData.thumbnail || '',
        status: formData.status
      };
      
      if (editingItem) {
        await axios.put(`http://localhost:5000/api/admin/courses/${editingItem.id}`, courseData, headers);
        toast.success('Course updated');
      } else {
        await axios.post('http://localhost:5000/api/admin/courses', courseData, headers);
        toast.success('Course created');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save course');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingCategory) {
        await axios.put(`http://localhost:5000/api/admin/categories/${editingCategory.id}`, catForm, headers);
        toast.success('Category updated');
      } else {
        await axios.post('http://localhost:5000/api/admin/categories', catForm, headers);
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCatForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', description: '', category_id: '', instructor_id: '', 
      price: 0, level: 'beginner', thumbnail: '', status: 'approved' 
    });
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Delete this item?')) {
      const token = localStorage.getItem('token');
      const endpoint = type === 'course' ? `/api/admin/courses/${id}` : `/api/admin/categories/${id}`;
      await axios.delete(`http://localhost:5000${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${type} deleted`);
      loadData();
    }
  };

  const handleApprove = async (courseId) => {
    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:5000/api/admin/approve-course/${courseId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    toast.success('Course approved');
    loadData();
  };

  const handleReject = async (courseId) => {
    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:5000/api/admin/reject-course/${courseId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    toast.success('Course rejected');
    loadData();
  };

  const userDistributionData = {
    labels: ['Students', 'Instructors', 'Admins'],
    datasets: [{
      data: [stats.totalStudents, stats.totalInstructors, 1],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      borderWidth: 0
    }]
  };

  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Revenue ($)',
      data: [12000, 19000, 15000, 25000, 22000, 30000],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const enrollmentData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Enrollments',
      data: [65, 85, 70, 95, 88, 120],
      backgroundColor: 'rgba(34,197,94,0.5)',
      borderColor: '#22C55E',
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top' } }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'bottom' } }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{value}</p>
        </div>
        <div style={{ background: color, padding: '12px', borderRadius: '12px', color: 'white' }}>{icon}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '5px' }}>Admin Dashboard</h1>
            <p style={{ color: '#6B7280' }}>Welcome back, {user?.name}!</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setShowCategoryModal(true); setEditingCategory(null); setCatForm({ name: '', description: '' }); }} style={{ background: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaTags /> Add Category
            </button>
            <button onClick={() => { setShowModal(true); setEditingItem(null); resetForm(); }} style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus /> Add Course
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <StatCard title="Total Users" value={stats.totalUsers} icon={<FaUsers size={18} />} color="#3B82F6" />
          <StatCard title="Students" value={stats.totalStudents} icon={<FaUserGraduate size={18} />} color="#10B981" />
          <StatCard title="Instructors" value={stats.totalInstructors} icon={<FaChalkboardTeacher size={18} />} color="#8B5CF6" />
          <StatCard title="Courses" value={stats.totalCourses} icon={<FaBookOpen size={18} />} color="#6366F1" />
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '20px', display: 'flex', gap: '20px' }}>
          <button onClick={() => setActiveTab('overview')} style={{ padding: '10px 0', borderBottom: activeTab === 'overview' ? '2px solid #2563EB' : 'none', color: activeTab === 'overview' ? '#2563EB' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Overview</button>
          <button onClick={() => setActiveTab('courses')} style={{ padding: '10px 0', borderBottom: activeTab === 'courses' ? '2px solid #2563EB' : 'none', color: activeTab === 'courses' ? '#2563EB' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Courses</button>
          <button onClick={() => setActiveTab('users')} style={{ padding: '10px 0', borderBottom: activeTab === 'users' ? '2px solid #2563EB' : 'none', color: activeTab === 'users' ? '#2563EB' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Users</button>
          <button onClick={() => setActiveTab('categories')} style={{ padding: '10px 0', borderBottom: activeTab === 'categories' ? '2px solid #2563EB' : 'none', color: activeTab === 'categories' ? '#2563EB' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Categories</button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              {/* Pie Chart */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>User Distribution</h3>
                <div style={{ height: '250px' }}>
                  <Pie data={userDistributionData} options={pieOptions} />
                </div>
                <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>
                  <span style={{ display: 'inline-block', marginRight: '15px' }}><span style={{ background: '#3B82F6', width: '10px', height: '10px', display: 'inline-block', borderRadius: '50%', marginRight: '5px' }}></span> Students: {stats.totalStudents}</span>
                  <span style={{ display: 'inline-block', marginRight: '15px' }}><span style={{ background: '#10B981', width: '10px', height: '10px', display: 'inline-block', borderRadius: '50%', marginRight: '5px' }}></span> Instructors: {stats.totalInstructors}</span>
                  <span><span style={{ background: '#F59E0B', width: '10px', height: '10px', display: 'inline-block', borderRadius: '50%', marginRight: '5px' }}></span> Admins: 1</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>Revenue Overview</h3>
                <div style={{ height: '250px' }}>
                  <Bar data={revenueData} options={chartOptions} />
                </div>
              </div>

              {/* Line Chart */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>Enrollment Trends</h3>
                <div style={{ height: '250px' }}>
                  <Line data={enrollmentData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Platform Summary</h3>
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Total Revenue:</span><strong>${stats.totalRevenue}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Total Enrollments:</span><strong>{stats.totalEnrollments}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Average Rating:</span><strong>{stats.averageRating} / 5</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pending Approvals:</span><strong style={{ color: '#F59E0B' }}>{stats.pendingCourses}</strong></div>
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Quick Stats</h3>
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Student/Instructor Ratio:</span><strong>{(stats.totalStudents / (stats.totalInstructors || 1)).toFixed(1)}:1</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Courses per Student:</span><strong>{(stats.totalEnrollments / (stats.totalStudents || 1)).toFixed(1)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform Growth:</span><strong style={{ color: '#10B981' }}>↑ 15%</strong></div>
                </div>
              </div>
            </div>

            {/* Recent Users */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Recent Users</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px' }}>{u.name}</td>
                        <td style={{ padding: '10px' }}>{u.email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: u.role === 'admin' ? '#FEE2E2' : u.role === 'instructor' ? '#DBEAFE' : '#D1FAE5', color: u.role === 'admin' ? '#991B1B' : u.role === 'instructor' ? '#1E40AF' : '#065F46' }}>{u.role}</span>
                        </td>
                        <td style={{ padding: '10px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F9FAFB' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Instructor</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Students</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px' }}>
                        <div><strong>{course.title}</strong></div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{course.description?.substring(0, 50)}</div>
                      </td>
                      <td style={{ padding: '12px' }}>{course.instructor_name}</td>
                      <td style={{ padding: '12px' }}>{course.category_name}</td>
                      <td style={{ padding: '12px' }}>{course.price === 0 ? 'Free' : `$${course.price}`}</td>
                      <td style={{ padding: '12px' }}>{course.student_count || 0}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: course.status === 'approved' ? '#D1FAE5' : course.status === 'pending' ? '#FEF3C7' : '#FEE2E2', color: course.status === 'approved' ? '#065F46' : course.status === 'pending' ? '#92400E' : '#991B1B' }}>{course.status}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApprove(course.id)} style={{ color: '#10B981', background: 'none', border: 'none', cursor: 'pointer' }} title="Approve"><FaCheck /></button>
                          <button onClick={() => handleReject(course.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Reject"><FaTimes /></button>
                          <button onClick={() => { setShowModal(true); setEditingItem(course); setFormData({ title: course.title, description: course.description, category_id: course.category_id, instructor_id: course.instructor_id, price: course.price, level: course.level, thumbnail: course.thumbnail || '', status: course.status }); }} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }} title="Edit"><FaEdit /></button>
                          <button onClick={() => handleDelete('course', course.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Delete"><FaTrash /></button>
                          <a href={`/courses/${course.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CF6', background: 'none', border: 'none', cursor: 'pointer' }} title="View"><FaEye /></a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F9FAFB' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px' }}>{u.name}</td>
                      <td style={{ padding: '12px' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: u.role === 'admin' ? '#FEE2E2' : u.role === 'instructor' ? '#DBEAFE' : '#D1FAE5', color: u.role === 'admin' ? '#991B1B' : u.role === 'instructor' ? '#1E40AF' : '#065F46' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button onClick={() => { setShowCategoryModal(true); setEditingCategory(null); setCatForm({ name: '', description: '' }); }} style={{ background: '#10B981', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                <FaTags /> Add Category
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>{cat.name}</h3>
                      <p style={{ fontSize: '14px', color: '#6B7280' }}>{cat.description || 'No description'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowCategoryModal(true); setEditingCategory(cat); setCatForm({ name: cat.name, description: cat.description || '' }); }} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete('category', cat.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB', fontSize: '11px', color: '#9CA3AF' }}>
                    Created: {new Date(cat.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflow: 'auto' }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingItem ? 'Edit Course' : 'Create New Course'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSaveCourse}>
              <input type="text" placeholder="Course Title *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} required />
              <textarea placeholder="Description *" rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} required />
              
              <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} required>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              
              <select value={formData.instructor_id} onChange={e => setFormData({...formData, instructor_id: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} required>
                <option value="">Select Instructor</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px' }}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <input type="number" step="0.01" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px' }} />
              </div>
              
              <input type="text" placeholder="Thumbnail URL (optional)" value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} />
              
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '450px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <input type="text" placeholder="Category Name *" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} required />
              <textarea placeholder="Description" rows="3" value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{editingCategory ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;