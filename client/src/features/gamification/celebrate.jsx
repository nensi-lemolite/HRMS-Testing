import { useRef, useState, useCallback } from 'react';

// Fires a lightweight confetti burst from the middle of the screen.
export function confetti() {
  if (typeof document === 'undefined') return;
  const colors = ['#0e9f6e', '#12b981', '#f59e0b', '#ec4899', '#0ea5e9', '#22c55e'];
  for (let i = 0; i < 26; i++) {
    const d = document.createElement('div');
    d.className = 'gm-confetti';
    d.style.background = colors[i % colors.length];
    d.style.left = 45 + Math.random() * 10 + '%';
    d.style.top = '28%';
    document.body.appendChild(d);
    const dx = (Math.random() - 0.5) * 440;
    const dy = 260 + Math.random() * 260;
    const rot = Math.random() * 720;
    d.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }
    );
    setTimeout(() => d.remove(), 1900);
  }
}

// Hook that gives a celebrate(msg) trigger + a <Toast/> element to render.
export function useCelebrate() {
  const [msg, setMsg] = useState('');
  const timer = useRef();
  const celebrate = useCallback((text) => {
    setMsg(text);
    confetti();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  const Toast = msg ? <div className="gm-toast show">🎉&nbsp; {msg}</div> : null;
  return { celebrate, Toast };
}
