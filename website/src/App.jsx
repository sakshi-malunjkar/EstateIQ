import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ContactPage from './pages/ContactPage';
import ContactModal from './components/ContactModal';
import LoginModal from './components/LoginModal';
import PostPropertyModal from './components/PostPropertyModal';
import CitySelectModal from './components/CitySelectModal';

export default function App() {
  const [selectedCity, setSelectedCity] = useState('Pune'); // Defaulting active focus or seamless city toggle
  
  // Modals state
  const [contactModalProp, setContactModalProp] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPostPropertyModalOpen, setIsPostPropertyModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const handleOpenContactModal = (property) => {
    setContactModalProp(property);
    setIsContactModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-900 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        selectedCity={selectedCity}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenPostProperty={() => setIsPostPropertyModalOpen(true)}
      />

      {/* Main Page Routing */}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                onContactClick={handleOpenContactModal}
                onOpenPostProperty={() => setIsPostPropertyModalOpen(true)}
                onOpenCityModal={() => setIsCityModalOpen(true)}
              />
            }
          />
          <Route
            path="/properties"
            element={
              <PropertiesPage
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                onContactClick={handleOpenContactModal}
              />
            }
          />
          <Route
            path="/property/:id"
            element={
              <PropertyDetailPage
                onContactClick={handleOpenContactModal}
              />
            }
          />
          <Route
            path="/contact"
            element={<ContactPage />}
          />
        </Routes>
      </main>

      {/* Footer Component */}
      <Footer />

      {/* Interactive Global Modals */}
      <CitySelectModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={(c) => setSelectedCity(c)}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        property={contactModalProp}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <PostPropertyModal
        isOpen={isPostPropertyModalOpen}
        onClose={() => setIsPostPropertyModalOpen(false)}
      />

    </div>
  );
}
