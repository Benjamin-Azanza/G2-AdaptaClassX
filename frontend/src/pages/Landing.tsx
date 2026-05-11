import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing-page bg-[#0d0e15] min-h-screen text-white">
      {/* Hero Container */}
      <div className="w-full">
        <div className="hero-box relative mx-auto rounded-b-2xl md:rounded-b-[2rem] border-b-2 border-x-2 border-[#00ffcc] shadow-[0_10px_20px_rgba(0,255,204,0.2)] max-w-[1400px]">

          <img src="/landing/hero-main.png" alt="Adapta Class Hero" className="w-full h-auto block" />

          {/* Team Logo overlapping hero bottom - responsive, no deformation */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[10%] z-20 pointer-events-none w-[28%] max-w-[220px] md:max-w-[320px]">
            <img
              src="/landing/teamlogo.png"
              alt="Team Logo"
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Navbar Inside Hero */}
          <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-0 md:px-12 bg-transparent">
            {/* Left: Logo + Games */}
            <div className="flex items-center gap-4">
              <Link to="/">
                <img src="/landing/logo-nav.png" alt="Adapta Class Logo" className="h-20 md:h-40 object-contain" />
              </Link>
              <div className="hidden md:flex gap-6 ml-2">
                <Link to="#" className="text-gray-100 hover:text-white font-semibold transition">Games</Link>
              </div>
            </div>

            {/* Right: Desktop buttons or Mobile hamburger */}
            <div className="flex items-center">
              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-4">
                <Link to="/login" className="text-gray-100 hover:text-white font-semibold transition">Log in</Link>
                <Link
                  to="/register"
                  className="px-5 py-2 border border-indigo-400 rounded text-indigo-100 font-semibold hover:bg-indigo-500/20 backdrop-blur-sm transition"
                >
                  Sign up
                </Link>
              </div>

              {/* Mobile hamburger button */}
              <button
                className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10 rounded-md bg-black/40 backdrop-blur-sm border border-white/10"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </button>
            </div>
          </nav>

          {/* Mobile Dropdown: rendered INSIDE hero but with fixed positioning to escape overflow:hidden */}
        </div>
      </div>

      {/* Mobile Dropdown Menu — fixed to viewport, escapes all overflow containers */}
      {menuOpen && (
        <div className="fixed top-0 right-0 h-screen w-[260px] z-[999] md:hidden bg-[#11121a] border-l border-[#232536] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <span className="text-white font-bold text-sm tracking-widest uppercase">Menu</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-gray-400 hover:text-white text-2xl leading-none transition"
              aria-label="Close menu"
            >
              &times;
            </button>
          </div>
          {/* Links */}
          <div className="flex flex-col gap-2 p-5 flex-1">
            <Link
              to="#"
              className="flex items-center gap-3 text-gray-200 hover:text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/5 transition"
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-lg">🎮</span> Games
            </Link>
            <div className="border-t border-gray-800 my-2" />
            <Link
              to="/login"
              className="flex items-center gap-3 text-gray-200 hover:text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/5 transition"
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-lg">🔑</span> Log in
            </Link>
            <Link
              to="/register"
              className="flex items-center justify-center gap-2 mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition"
              onClick={() => setMenuOpen(false)}
            >
              Sign up
            </Link>
          </div>
        </div>
      )}

      {/* Backdrop overlay when menu is open */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[998] bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Hero Subtext */}
      <div className="text-center mt-6 mb-16 px-4">
        <h2 className="text-[#667eea] text-xl md:text-2xl lg:text-3xl font-normal tracking-wide leading-relaxed">
          Create amazing 2D games for the web &mdash;<br />
          free, open source, and AI-ready.
        </h2>
      </div>

      {/* Featured Games */}
      <section className="showcase-bg py-24 px-8 md:px-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start gap-4">
            <span className="text-xs text-blue-400 font-bold tracking-widest uppercase">
              Games Built With Adapta Class
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Dark Cone: Maze Horror Game Built with Adapta
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              A top-down survival prototype featuring dynamic lighting, roaming enemies, and a progressive difficulty curve. Explore the maze, survive the horrors, and find your way out.
            </p>
            <button
              onClick={() => navigate('/games/bomb-game')}
              className="neon-btn px-8 py-3 rounded mt-4 font-semibold uppercase tracking-wide"
            >
              Play Game
            </button>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src="/landing/showcase-game.png"
              alt="Game Showcase"
              className="diagonal-showcase w-full max-w-md object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8 md:px-16 bg-[#0d0e15]">
        <div className="max-w-6xl mx-auto flex flex-col gap-24">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold text-white">Built from the ground up</h3>
              <p className="text-gray-400 text-lg">
                Our platform uses modern web technologies to deliver high-performance educational games directly to your browser. No downloads required, just instant access to engaging learning tools.
              </p>
            </div>
            <div>
              <img src="/landing/feature-1.png" alt="Feature 1" className="w-full rounded-xl border border-gray-800 shadow-2xl" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img src="/landing/feature-2.png" alt="Feature 2" className="w-full rounded-xl border border-gray-800 shadow-2xl" />
            </div>
            <div className="flex flex-col gap-4 order-1 md:order-2">
              <h3 className="text-3xl font-bold text-white">Visual Editor and Analytics</h3>
              <p className="text-gray-400 text-lg">
                Track student progress and manage your classes with our intuitive dashboards. Built to provide teachers with actionable insights while students focus on the fun of learning.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0e15] pt-20">
        <div className="footer-content max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-gray-800/50 pt-12 px-8 mb-20">

          {/* Column 1: Identity */}
          <div className="flex flex-col items-start gap-4">
            <img src="/landing/logo-nav.png" alt="Logo" className="w-40 md:w-56 object-contain" />
            <p className="text-gray-500 text-sm mt-4">
              © 2026 Adapta Class Inc. All rights reserved.
            </p>
            <Link to="#" className="text-indigo-400 hover:underline text-sm transition">
              Privacy & Cookie Policy
            </Link>
          </div>

          {/* Column 2: Quick Links */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-indigo-400 font-semibold mb-4">v1.0.0</span>
            <div className="flex flex-col space-y-2 text-center md:text-left">
              <Link to="#" className="text-gray-400 hover:text-white transition">Juegos</Link>
              <Link to="#" className="text-gray-400 hover:text-white transition">Documentación</Link>
              <Link to="#" className="text-gray-400 hover:text-white transition">Contacto</Link>
            </div>
          </div>
        </div>

        {/* Footer Background Section at the very bottom */}
        <div className="relative w-full overflow-hidden mt-10">
          <div className="footer-lights"></div>
          <img
            src="/landing/footer-bg.png"
            alt="Footer Decoration"
            className="w-full h-auto block min-h-[200px] object-cover md:object-contain"
          />
        </div>
      </footer>
    </div>
  );
}
