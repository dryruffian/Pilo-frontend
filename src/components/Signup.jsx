import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

const SignupCard = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    allergies: [],
    preferences: []
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const allergyOptions = [
    { value: 'gluten', label: 'Gluten' },
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'eggs', label: 'Eggs' },
    { value: 'milk', label: 'Milk' },
    { value: 'sesame-seeds', label: 'Sesame Seeds' },
    { value: 'gelatin', label: 'Gelatin' },
    { value: 'mustard', label: 'Mustard' },
    { value: 'fish', label: 'Fish' },
    { value: 'soybeans', label: 'Soybeans' },
    { value: 'nuts', label: 'Tree Nuts' },
    { value: 'celery', label: 'Celery' }
  ];

  const dietaryPreferences = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'halal', label: 'Halal' },
    { value: 'kosher', label: 'Kosher' },
    { value: 'dairy-free', label: 'Dairy Free' },
    { value: 'gluten-free', label: 'Gluten Free' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(formData.age) || formData.age < 1) {
      newErrors.age = 'Please enter a valid age';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        allergies: formData.allergies.map(a => a.value),
        preferences: formData.preferences.map(p => p.value)
      };

      const response = await axios.post('https://3x94zm9g-3000.inc1.devtunnels.ms/auth/signup', payload);
      
      localStorage.setItem('token', `Bearer ${response.data.data.token}`);
      navigate('/scan');
    } catch (error) {
      console.error('Signup error:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.response?.data?.message || 'An error occurred during signup'
      }));
    }
  };

  return (
    <div className="relative border-2 border-black w-full max-w-md bg-[#F6F9CD] rounded-[30px] p-4">
      <div className="flex flex-col gap-4">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-gray-600 text-sm font-semibold mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.name ? 'border-red-500' : ''
            }`}
            placeholder="Enter your name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-gray-600 text-sm font-semibold mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.email ? 'border-red-500' : ''
            }`}
            placeholder="Enter your email"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-gray-600 text-sm font-semibold mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.password ? 'border-red-500' : ''
            }`}
            placeholder="Enter your password"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        {/* Age Input */}
        <div>
          <label htmlFor="age" className="block text-gray-600 text-sm font-semibold mb-2">
            Age
          </label>
          <input
            type="number"
            id="age"
            value={formData.age}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.age ? 'border-red-500' : ''
            }`}
            placeholder="Enter your age"
          />
          {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
        </div>

        {/* Allergies Select */}
        <div>
          <label htmlFor="allergies" className="block text-gray-600 text-sm font-semibold mb-2">
            Allergies
          </label>
          <Select
            id="allergies"
            isMulti
            value={formData.allergies}
            onChange={(selected) => setFormData(prev => ({ ...prev, allergies: selected || [] }))}
            options={allergyOptions}
            className="shadow appearance-none border rounded w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Select your allergies"
          />
        </div>

        {/* Dietary Preferences */}
        <div>
          <label htmlFor="preferences" className="block text-gray-600 text-sm font-semibold mb-2">
            Dietary Preferences
          </label>
          <Select
            id="preferences"
            isMulti
            value={formData.preferences}
            onChange={(selected) => setFormData(prev => ({ ...prev, preferences: selected || [] }))}
            options={dietaryPreferences}
            className="shadow appearance-none border rounded w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Select your dietary preferences"
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="text-red-500 text-sm text-center">{errors.submit}</div>
        )}

        {/* Sign Up Button */}
        <button
          className="bg-black border-black border-separate text-white px-4 py-2 rounded-md text-md cursor-pointer hover:bg-gray-800 transition-colors duration-200"
          onClick={handleSignup}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default SignupCard;