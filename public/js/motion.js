/**
 * TRACE Motion Engine
 * Delivers compositor-optimized animations, counter roll-ups, and interactive feedback
 * Compliant with modern-web-guidance and prefers-reduced-motion
 */

const Motion = {
  // Check if reduced motion is requested
  isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Tactile haptic feedback on mobile if supported
  haptic(ms = 12) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  },

  // Cubic easing function
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  // Animated number counter
  animateNumber(el, targetValue, duration = 650, prefix = '₹') {
    if (!el) return;
    const finalVal = Math.round(targetValue);
    if (this.isReducedMotion()) {
      el.textContent = `${prefix}${finalVal.toLocaleString('en-IN')}`;
      return;
    }

    const currentText = el.textContent.replace(/[^0-9.-]/g, '');
    const startVal = parseFloat(currentText) || 0;
    const diff = finalVal - startVal;
    if (Math.abs(diff) < 1) {
      el.textContent = `${prefix}${finalVal.toLocaleString('en-IN')}`;
      return;
    }

    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * eased);
      el.textContent = `${prefix}${current.toLocaleString('en-IN')}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = `${prefix}${finalVal.toLocaleString('en-IN')}`;
      }
    }

    requestAnimationFrame(update);
  },

  // Stagger animate list items
  staggerCards(containerSelector, itemSelector = '.card') {
    if (this.isReducedMotion()) return;
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = container.querySelectorAll(itemSelector);
    items.forEach((item, index) => {
      item.style.animationDelay = `${index * 50}ms`;
      item.classList.add('card-enter');
    });
  },

  // Toast notification with spring animation
  toast(message, duration = 2600) {
    this.haptic(15);
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }
};

window.Motion = Motion;
