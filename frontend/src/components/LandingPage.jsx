import React, { useState, useEffect } from 'react';
import {
  Upload,
  Settings,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Globe2,
  AlertCircle,
  LayoutTemplate,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  FileText,
  PenTool,
  Menu,
  X
} from 'lucide-react';
import './LandingPage.css';

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
);

const LandingPage = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleGetStarted = () => {
    window.location.href = '/app';
  };

  return (
    <div className={`lp-app-wrapper theme-${theme}`}>
      {/* Background Ambient Glow & Particles Simulator */}
      <div className="lp-ambient-bg">
        <div className="lp-glow-sphere sphere-1"></div>
        <div className="lp-glow-sphere sphere-2"></div>
      </div>

      {/* 1. NAVBAR (AI STUDIO) */}
      <nav className="ai-navbar">
        <div className="ai-nav-grid-bg"></div>
        <div className="ai-navbar-content">
          <div className="ai-nav-logo">
            <Globe2 size={24} className="ai-logo-icon" />
            <span>TranslationStudio</span>
          </div>

          <div className="ai-nav-right">
            <div className={`ai-nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
              <a href="#usecases" onClick={() => setIsMobileMenuOpen(false)}>Flow</a>
              <a href="#blog" onClick={() => setIsMobileMenuOpen(false)}>Blog</a>
            </div>

            <div className="ai-nav-actions">
              <button className="ai-theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <button className="ai-nav-cta-btn" onClick={handleGetStarted}>
                Get Started
              </button>
              <button className="ai-mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        <div className="ai-nav-border-glow"></div>
      </nav>

      {/* 2. HERO SECTION (AI STUDIO VIBE) */}
      <section className="lp-hero-section ai-studio-hero">
        <div className="ai-grid-background"></div>
        <div className="ai-particles">
          <div className="ai-particle p1"></div>
          <div className="ai-particle p2"></div>
          <div className="ai-particle p3"></div>
          <div className="ai-particle p4"></div>
        </div>
        <div className="ai-glow-overlay"></div>

        <div className="lp-hero-content ai-hero-content">

          <div className="lp-hero-text slide-in-left">
            <h1 className="lp-hero-headline">
              AI Translation Studio that <br />
              <span className="lp-gradient-text ai-animated-gradient">never breaks your formatting</span>.
            </h1>
            <p className="lp-hero-subhead">
              Translate enterprise documents with perfect accuracy, glossary control, and preserved layouts. Built for professional workflows.
            </p>
            <div className="lp-cta-group">
              <button className="lp-btn-primary lp-btn-xl ai-btn-primary" onClick={handleGetStarted}>
                Start Translating <ArrowRight size={18} />
              </button>
              <button className="lp-btn-secondary lp-btn-xl ai-btn-secondary">
                Try Demo
              </button>
            </div>
            <p className="lp-hero-disclaimer">No credit card required.</p>
          </div>

          {/* RIGHT SIDE: AI PROMPT BOX & FLOATING CARDS */}
          <div className="lp-hero-visuals ai-hero-visuals">
            <div className="ai-composition-engine">

              {/* Back Layer Float */}
              <div className="ai-float-card ai-pdf-card">
                <FileText size={32} className="ai-icon-blue" />
                <div className="ai-lines"><div className="l1"></div><div className="l2"></div></div>
              </div>

              <div className="ai-float-card ai-chart-card">
                <LayoutTemplate size={32} className="ai-icon-purple" />
                <div className="ai-mini-chart"></div>
              </div>

              {/* Main Center AI Box */}
              <div className="ai-main-prompt-box">
                <div className="ai-box-shine"></div>
                <div className="ai-prompt-header">
                  <Cpu size={16} className="ai-icon-pulse" /> <span>Translation Engine Active</span>
                </div>
                <div className="ai-prompt-body">
                  <p className="source-text">"The Q3 financial projections indicate a 14% yield..."</p>
                  <div className="ai-processing-bar"><div className="ai-progress-fill"></div></div>
                  <p className="target-text">"Les prévisions financières du T3 indiquent..." <span className="ai-cursor"></span></p>
                </div>
                <div className="ai-prompt-footer">
                  <div className="ai-tag">Glossary Enforced</div>
                  <div className="ai-tag highlight">100% Format Retained</div>
                </div>
              </div>

              {/* Front Fast Float */}
              <div className="ai-float-card ai-snippet-card">
                <ShieldCheck size={18} className="ai-icon-green" /> <span>Syntax Verified</span>
              </div>

            </div>
          </div>
        </div>
      </section>



      {/* 4. FEATURES GRID */}
      <section id="features" className="lp-features-grid-section">
        <div className="lp-grid-wrapper">

          <div className="lp-grid-card">
            <div className="grid-icon"><Cpu size={24} /></div>
            <h3>AI Translation with LLM</h3>
            <p>Access frontier neural models tuned specifically for contextual depth and industry-specific phrasing.</p>
          </div>

          <div className="lp-grid-card">
            <div className="grid-icon"><BookOpen size={24} /></div>
            <h3>Glossary Enforcement</h3>
            <p>Ensure identical brand messaging and specialized terminology definitions are strictly enforced block-by-block.</p>
          </div>

          <div className="lp-grid-card">
            <div className="grid-icon"><Globe2 size={24} /></div>
            <h3>Translation Memory (RAG)</h3>
            <p>Leverage historical translation databases. Reuse previously verified sentences instantly without hallucination risk.</p>
          </div>

          <div className="lp-grid-card">
            <div className="grid-icon"><ShieldCheck size={24} /></div>
            <h3>Source Quality Validation</h3>
            <p>Automatically detect source-text anomalies, spelling errors, and missing data points before translating.</p>
          </div>

          <div className="lp-grid-card">
            <div className="grid-icon"><PenTool size={24} /></div>
            <h3>Style & Tone Control</h3>
            <p>Dynamically shape the output from highly formal enterprise legalese to conversational marketing copy.</p>
          </div>

          <div className="lp-grid-card">
            <div className="grid-icon"><Globe2 size={24} /></div>
            <h3>Real-time Collaboration</h3>
            <p>Review terminology flags inline, approve machine translations, and edit custom text side-by-side with your team.</p>
          </div>

        </div>
      </section>

      {/* 5. HOW IT WORKS (STEP FLOW UI) */}
      <section id="usecases" className="lp-how-it-works">
        <div className="lp-hiw-header">
          <h2>Translation flow reconstructed</h2>
        </div>

        <div className="lp-hiw-timeline">

          <div className="hiw-step">
            <div className="hiw-circle"><Upload size={20} /></div>
            <h4>Upload Document</h4>
            <p>Pass your PDF/DOCX to the secure parser.</p>
          </div>

          <div className="hiw-connector"></div>

          <div className="hiw-step">
            <div className="hiw-circle"><AlertCircle size={20} /></div>
            <h4>AI Validation</h4>
            <p>Identify format dependencies and anomalies.</p>
          </div>

          <div className="hiw-connector"></div>

          <div className="hiw-step">
            <div className="hiw-circle"><Zap size={20} /></div>
            <h4>Smart Translation</h4>
            <p>LLM mapping overlaid with translation memory.</p>
          </div>

          <div className="hiw-connector"></div>

          <div className="hiw-step">
            <div className="hiw-circle"><CheckCircle2 size={20} /></div>
            <h4>Review & Approve</h4>
            <p>Accept quality fixes and export layout-perfect files.</p>
          </div>

        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section id="pricing" className="lp-final-cta-section">
        <div className="lp-cta-glow-container">
          <h2>Ready to Transform Your Translation Workflow?</h2>
          <button className="lp-btn-primary lp-btn-xl" onClick={handleGetStarted}>
            Start Translating Now <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer id="blog" className="lp-app-footer">
        <div className="footer-top">
          <div className="footer-brand-side">
            <div className="lp-nav-logo">
              <Globe2 size={24} className="lp-logo-icon" />
              <span>TranslationStudio</span>
            </div>
            <p>Next-generation enterprise localization tooling.</p>
          </div>
          <div className="footer-links-side">
            <a href="#">About</a>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className="footer-bot">
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} AI Translation Studio. All rights reserved.
          </div>
          <div className="footer-social-txt">
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
            <a href="#">X / Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
