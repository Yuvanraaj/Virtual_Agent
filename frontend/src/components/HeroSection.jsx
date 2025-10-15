import React from 'react';
import { useLocation } from 'wouter';
import Button from './Button';

export default function HeroSection() {
  const [, setLocation] = useLocation();

  const handleStartDemo = () => {
    setLocation('/start');
  };

  const handleWatchDemo = () => {
    // perhaps open a video or something
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="absolute inset-0" style={{ background: 'var(--bg-accent)', pointerEvents: 'none' }} />

      <div className="relative max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
          Ace Your Job Interviews with{' '}
          <span style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            AI-Powered Coaching
          </span>
        </h1>

        <p className="text-lg sm:text-xl max-w-3xl mx-auto mb-8 leading-relaxed muted-text">
          Practice with Lana AI, your AI interview coach. Get personalized feedback, improve your answers, and build confidence for your next interview.
        </p>

        <div className="flex items-center justify-center">
          <Button
            size="lg"
            onClick={handleStartDemo}
            className="accent-btn font-semibold px-10 py-6 h-auto text-lg"
          >
            Start Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
