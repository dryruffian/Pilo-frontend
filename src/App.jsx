// client/src/App.jsx
import './App.css';
import Scanner from './components/Scanner';
import Product from './components/Product';
import Navbar from './components/Navbar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductPage from './components/ProductPage';
import Signup from './components/Signup';
import Login from './components/Login';
import { RecoilRoot } from 'recoil';
import { AuthProvider } from './context/authContext';
import { ProtectedRoute } from './components/Auth';
import Profile from './components/Profile';
import History from './pages/history';

function App() {
  return (
    <AuthProvider>
      <RecoilRoot>
        <div className='h-screen flex flex-col items-center space-y-5 py-2 px-4'>
          <BrowserRouter>
            {/* Main Content Area */}
            <Routes>
              {/* Public Routes */}
              <Route path='/login' element={<Login />} />
              <Route path='/signup' element={<Signup />} />
              <Route path='/user' element={<Profile />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path='/history' element={<History/>}/>
                <Route path='/' element={<Product />} />
                <Route path='/scan' element={<Scanner />} />
                <Route path='/product/:barcode' element={<ProductPage />} />
                <Route path='/page' element={<Product />} />
              </Route>
            </Routes>

            {/* Navbar - Only show on protected routes and not on login/signup */}
            {!['/login', '/signup'].includes(window.location.pathname) && <Navbar />}
          </BrowserRouter>
        </div>
      </RecoilRoot>
    </AuthProvider>
  );
}

export default App;