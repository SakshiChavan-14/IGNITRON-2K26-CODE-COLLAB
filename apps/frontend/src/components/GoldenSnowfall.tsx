import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  baseOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
}

interface GoldenTrail {
  x: number;
  y: number;
  length: number;
  width: number;
  opacity: number;
  speed: number;
  hasBead: boolean;
  beadRadius: number;
}

interface GoldenBokeh {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  driftX: number;
  driftY: number;
}

const GOLD_PALETTE = [
  '#ffd700', // Classic gold
  '#ffdf6d', // Light gold
  '#f6c445', // Warm gold
  '#f59e0b', // Amber-gold
  '#ffeb99', // Bright champagne
  '#eab308', // Radiant yellow gold
];

export const GoldenSnowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Support prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Scale particle count based on screen width
    const particleCount = Math.min(130, Math.max(50, Math.floor(width / 14)));
    const trailCount = Math.min(26, Math.max(12, Math.floor(width / 60)));
    const bokehCount = Math.min(18, Math.max(8, Math.floor(width / 90)));

    // 1. Initialize Golden Falling Particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const baseOpacity = 0.35 + Math.random() * 0.55;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.9 + Math.random() * 2.6,
        speedY: 0.45 + Math.random() * 1.6,
        speedX: (Math.random() - 0.5) * 0.35,
        opacity: baseOpacity,
        baseOpacity,
        pulseSpeed: 0.015 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
        color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
      });
    }

    // 2. Initialize Subtle Vertical Golden Light Trails
    const trails: GoldenTrail[] = [];
    for (let i = 0; i < trailCount; i++) {
      trails.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.45),
        length: 25 + Math.random() * 90,
        width: 0.75 + Math.random() * 1.25,
        opacity: 0.15 + Math.random() * 0.45,
        speed: 0.2 + Math.random() * 0.6,
        hasBead: Math.random() > 0.3,
        beadRadius: 1.5 + Math.random() * 2.2,
      });
    }

    // 3. Initialize Top Golden Bokeh Halos
    const bokehs: GoldenBokeh[] = [];
    for (let i = 0; i < bokehCount; i++) {
      bokehs.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.4),
        radius: 8 + Math.random() * 22,
        opacity: 0.05 + Math.random() * 0.18,
        driftX: (Math.random() - 0.5) * 0.1,
        driftY: (Math.random() - 0.5) * 0.1,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let time = 0;
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // --- Draw Bokeh Discs (Warm Golden Ambient Halos) ---
      for (const b of bokehs) {
        if (!prefersReducedMotion) {
          b.x += b.driftX;
          b.y += b.driftY;
          if (b.x < 0) b.x = width;
          if (b.x > width) b.x = 0;
        }

        const gradient = ctx.createRadialGradient(
          b.x,
          b.y,
          0,
          b.x,
          b.y,
          b.radius,
        );
        gradient.addColorStop(0, `rgba(251, 191, 36, ${b.opacity * 1.2})`);
        gradient.addColorStop(0.5, `rgba(245, 158, 11, ${b.opacity * 0.6})`);
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Draw Vertical Golden Light Trails ---
      for (const t of trails) {
        if (!prefersReducedMotion) {
          t.y += t.speed;
          if (t.y - t.length > height * 0.6) {
            t.y = -t.length;
            t.x = Math.random() * width;
          }
        }

        const trailGrad = ctx.createLinearGradient(
          t.x,
          t.y - t.length,
          t.x,
          t.y,
        );
        trailGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        trailGrad.addColorStop(0.7, `rgba(251, 191, 36, ${t.opacity * 0.5})`);
        trailGrad.addColorStop(1, `rgba(254, 240, 138, ${t.opacity})`);

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = t.width;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.length);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // Luminous glowing bead at the tip
        if (t.hasBead) {
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
          ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(1, t.opacity * 1.5)})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.beadRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // --- Draw Dynamic Falling Golden Snow Particles ---
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(time + p.pulsePhase) * 0.25;

          // Wrap around top when falling past bottom
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        // Shimmering alpha pulse
        p.opacity =
          p.baseOpacity + Math.sin(time * 3 + p.pulsePhase) * 0.22;
        const safeAlpha = Math.max(0.15, Math.min(1, p.opacity));

        ctx.save();
        ctx.shadowBlur = p.radius * 4;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = safeAlpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
