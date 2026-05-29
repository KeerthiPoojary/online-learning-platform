import React from 'react';
import { FaBookOpen } from 'react-icons/fa';

const PlaceholderImage = ({ title }) => {
  return (
    <div className="w-full h-48 bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
      <div className="text-center text-white">
        <FaBookOpen className="text-5xl mx-auto mb-2" />
        <p className="text-sm font-medium px-4">{title?.substring(0, 30) || 'Course Image'}</p>
      </div>
    </div>
  );
};

export default PlaceholderImage;