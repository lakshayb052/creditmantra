import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import PublicLanding from './components/PublicLanding';
import AgentPortal from './components/AgentPortal';
import AdminDashboard from './components/AdminDashboard';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsPage from './components/TermsPage';
// Cookie helper functions
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState(localStorage.getItem('creditmantra_theme') || 'light');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('creditmantra_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [utmParams, setUtmParams] = useState({ utm_source: '', utm_info: '' });
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  // Splash screen timer logic (fades out at 800ms, unmounts at 1000ms)
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 800);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Falling money notes animation logic on canvas
  useEffect(() => {
    if (!showSplash) return;
    const canvas = document.getElementById('money-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const maxParticles = 65;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class MoneyNote {
      constructor(isInitial = false) {
        this.reset(isInitial);
      }
      reset(isInitial = false) {
        this.width = Math.random() * 12 + 18;
        this.height = this.width * 1.8;
        this.x = Math.random() * canvas.width;
        this.y = isInitial ? Math.random() * canvas.height - this.height : -this.height - 20;
        this.speedY = Math.random() * 1.5 + 1.5;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;
        this.sway = Math.random() * 1.5 + 0.5;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
        this.swayTime = Math.random() * 100;
        
        const greenTones = ['#a7f3d0', '#86efac', '#4ade80', '#34d399', '#fef08a'];
        this.color = greenTones[Math.floor(Math.random() * greenTones.length)];
        this.border = Math.random() > 0.5 ? '#059669' : '#047857';
        this.symbol = Math.random() > 0.4 ? '₹' : '$';
      }
      update() {
        this.y += this.speedY;
        this.angle += this.rotationSpeed;
        this.swayTime += this.swaySpeed;
        this.x += Math.sin(this.swayTime) * this.sway;
        if (this.y > canvas.height + this.height || this.x < -this.width || this.x > canvas.width + this.width) {
          this.reset(false);
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.border;
        ctx.lineWidth = 1.5;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.strokeRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.font = `bold ${this.width * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
        ctx.restore();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new MoneyNote(true));
    }

    const animateMoney = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animateMoney);
    };

    animateMoney();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showSplash]);

  // Handle URL change detection (simple routing)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Parse and capture UTM and all URL query parameters on initial load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }

    // 1. Process Google Click ID (gclid) persistence
    const urlGclid = searchParams.get('gclid');
    if (urlGclid) {
      setCookie('gclid', urlGclid, 90);
      params.gclid = urlGclid;
    } else {
      const cookieGclid = getCookie('gclid');
      if (cookieGclid) {
        params.gclid = cookieGclid;
      }
    }

    // 2. Process Facebook Click ID (_fbc)
    const urlFbclid = searchParams.get('fbclid');
    if (urlFbclid) {
      const fbcVal = `fb.1.${Date.now()}.${urlFbclid}`;
      setCookie('_fbc', fbcVal, 90);
      params.fbclid = urlFbclid;
    } else {
      const cookieFbc = getCookie('_fbc');
      if (cookieFbc) {
        const parts = cookieFbc.split('.');
        const cookieFbclid = parts[parts.length - 1];
        if (cookieFbclid) {
          params.fbclid = cookieFbclid;
        }
      }
    }

    // 3. Process Facebook Browser ID (_fbp)
    let fbpVal = getCookie('_fbp');
    if (!fbpVal) {
      fbpVal = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2000000000)}`;
      setCookie('_fbp', fbpVal, 730); // 2 years
    }
    // Expose _fbp to tracking params if needed
    params._fbp = fbpVal;
    if (params.fbclid) {
      params._fbc = getCookie('_fbc') || `fb.1.${Date.now()}.${params.fbclid}`;
    }

    // Capture landing page, first landing page, and referrer
    params.landing_page = window.location.href;
    
    let firstLanding = sessionStorage.getItem('creditmantra_first_landing_page') || localStorage.getItem('creditmantra_first_landing_page');
    if (!firstLanding) {
      firstLanding = window.location.href;
      sessionStorage.setItem('creditmantra_first_landing_page', firstLanding);
      localStorage.setItem('creditmantra_first_landing_page', firstLanding);
    }
    params.first_landing_page = firstLanding;

    let referrerVal = sessionStorage.getItem('creditmantra_referrer') || localStorage.getItem('creditmantra_referrer');
    if (!referrerVal) {
      referrerVal = document.referrer || 'Direct';
      sessionStorage.setItem('creditmantra_referrer', referrerVal);
      localStorage.setItem('creditmantra_referrer', referrerVal);
    }
    params.referrer = referrerVal;

    // Explicitly guarantee utm_source and standard code usage fields exist
    if (!params.utm_source) params.utm_source = searchParams.get('utm_source') || '';
    if (!params.utm_medium) params.utm_medium = searchParams.get('utm_medium') || searchParams.get('utm_medem') || '';
    if (!params.utm_info) params.utm_info = searchParams.get('utm_info') || params.utm_medium || '';
    if (!params.utm_device) params.utm_device = searchParams.get('utm_device') || searchParams.get('device') || '';
    if (!params.utm_location) params.utm_location = searchParams.get('utm_location') || searchParams.get('location') || '';
    if (!params.ad_id) params.ad_id = searchParams.get('utm_creative') || searchParams.get('ad_id') || '';
    if (!params.utm_internal) params.utm_internal = searchParams.get('utm_internal') || '';

    // Merge URL params with cached params if any, prioritizing URL parameters
    const cachedStr = sessionStorage.getItem('creditmantra_utm');
    const cachedParams = cachedStr ? JSON.parse(cachedStr) : {};
    
    const mergedParams = {
      ...cachedParams,
      ...params
    };

    setUtmParams(mergedParams);
    sessionStorage.setItem('creditmantra_utm', JSON.stringify(mergedParams));
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Route Dispatcher
  const renderView = () => {
    const pathParts = currentPath.split('/');
    if (pathParts[1] === 'refer') {
      const activeParts = pathParts.filter(Boolean);
      const urn = activeParts[activeParts.length - 1];
      return <ReferralRedirect urn={urn} />;
    }
    if (currentPath === '/agent') {
      return <AgentPortal navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} />;
    }
    if (currentPath === '/admin') {
      return <AdminDashboard navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} />;
    }
    if (currentPath === '/about') {
      return <AboutPage navigateTo={navigateTo} />;
    }
    if (currentPath === '/contact') {
      return <ContactPage navigateTo={navigateTo} />;
    }
    if (currentPath === '/privacy-policy') {
      return <PrivacyPolicyPage navigateTo={navigateTo} />;
    }
    if (currentPath === '/terms') {
      return <TermsPage navigateTo={navigateTo} />;
    }
    return <PublicLanding navigateTo={navigateTo} utmParams={utmParams} />;
  };

  return (
    <div className="app-container">
      {/* Premium Splash Screen with Falling Money Notes */}
      {showSplash && (
        <div id="splash-screen" className={fadeSplash ? 'fade-out' : ''}>
          <canvas id="money-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />
          <div className="splash-content" style={{ zIndex: 2 }}>
            <div className="brand-logo-container">
              <div className="brand-icon-wrapper" style={{
                background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
                borderRadius: '24px',
                width: '90px',
                height: '90px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
                border: '2px solid rgba(16, 185, 129, 0.15)',
                marginBottom: '10px'
              }}>
                <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', fill: '#10b981' }}>
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
              </div>
            </div>
            <h1 className="brand-title" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Credit<span style={{ color: 'var(--primary)' }}>Mantra</span></h1>
            <p className="brand-subtitle" style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '-5px' }}>Financial Solutions</p>
            <div className="loader-bar"></div>
          </div>
        </div>
      )}

      {/* Ambient Glow Blobs in Background */}
      <div className="glow-blob one"></div>
      <div className="glow-blob two"></div>

      {/* Header / Navbar - Hide on admin and agent portals to avoid duplicates */}
      {currentPath !== '/admin' && currentPath !== '/agent' && (
        <header className="navbar">
          <div className="nav-logo" onClick={() => navigateTo('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #34d399 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px var(--primary-glow)',
              border: '1.5px solid rgba(255,255,255,0.1)'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: '#0f172a' }}>
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.45rem', letterSpacing: '-0.03em' }}>CreditMantra</span>
          </div>
          <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentPath === '/' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--mint)', border: '1.5px solid rgba(22,163,123,0.35)', padding: '0.4em 0.85em', borderRadius: '999px', fontWeight: 700 }}>
                100% FREE • NO CHARGES
              </div>
            )}
            {currentPath === '/agent' && (
              <span className="nav-link active">Agent Terminal</span>
            )}
            {currentPath === '/admin' && (
              <span className="nav-link active">Admin Dashboard</span>
            )}
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme} 
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main>
        {renderView()}
      </main>
    </div>
  );
}

// Sub-component to resolve URN referral link and auto-redirect after splash screen
function ReferralRedirect({ urn }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [leadDetails, setLeadDetails] = useState(null);

  useEffect(() => {
    const fetchLeadAndRedirect = async () => {
      try {
        const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '5173') ? 'http://localhost:5000/api' : '/api';
        const res = await fetch(`${API_URL}/leads/urn/${urn}`);
        const data = await res.json();

        if (res.ok) {
          setLeadDetails(data);
          // Wait exactly 1 second (1000ms) total (to witness the full CreditMantra splash screen) before redirecting to bank
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1000);
        } else {
          setError(data.error || 'The requested URN reference details do not exist.');
          setLoading(false);
        }
      } catch (err) {
        setError('Network connectivity error. Unable to verify referral data.');
        setLoading(false);
      }
    };

    fetchLeadAndRedirect();
  }, [urn]);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '450px', textAlign: 'center', borderTop: '4px solid var(--err)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--err)' }}>Redirection Error</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
          <a href="/" className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>Go to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', padding: '2rem' }}>
        <div className="splash-loader" style={{ margin: '0 auto 1.25rem auto' }}></div>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Verifying Application Referral</h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>
          {leadDetails 
            ? `Referral valid. Safely redirecting ${leadDetails.full_name} to HDFC portal...` 
            : 'Locating secure banking endpoint...'}
        </p>
      </div>
    </div>
  );
}
