import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Hero from '../components/sections/Hero';
import ArtistSection from '../components/sections/Artist';
import Packages from '../components/sections/Packages';
import Gallery from '../components/sections/Gallery';
import Testimonials from '../components/sections/Testimonials';
import Booking from '../components/sections/Booking';

const Home = () => {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <Hero />
        <ArtistSection />
        <Packages />
        <Gallery />
        <Testimonials />
        <Booking />
      </main>
      <Footer />

      {/* Admin button (untuk website saja) */}
      <div className="fixed right-5 bottom-5 z-50">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold bg-amber-400 text-purple-950 hover:bg-amber-300 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)] border border-white/20"
        >
          Admin Panel
        </Link>
      </div>
    </div>
  );
};

export default Home;

