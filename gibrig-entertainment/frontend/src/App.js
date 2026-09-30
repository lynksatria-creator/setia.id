import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <SiteConfigProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </SiteConfigProvider>
  );
}

export default App;
