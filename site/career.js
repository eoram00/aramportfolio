(() => {
  const counters = [...document.querySelectorAll('[data-career-count]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = new Map();
  function finishAll() {
    frames.forEach(frame => cancelAnimationFrame(frame));
    frames.clear();
    counters.forEach(counter => { counter.textContent = counter.dataset.careerCount; });
  }
  if (!('IntersectionObserver' in window) || motion.matches) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      observer.unobserve(counter);
      if (motion.matches) return;
      const target = Number(counter.dataset.careerCount);
      const start = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - start) / 1250);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frames.set(counter, requestAnimationFrame(tick));
        else frames.delete(counter);
      }
      frames.set(counter, requestAnimationFrame(tick));
    });
  }, { threshold: .7 });
  counters.forEach(counter => observer.observe(counter));
  motion.addEventListener('change', () => {
    if (motion.matches) { observer.disconnect(); finishAll(); }
  });
})();
