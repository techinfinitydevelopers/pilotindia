/**
 * Framer Step Flow Interactive Script
 * Faithful recreation of Framer Step Flow component logic
 */
(function() {
  function initStepFlow() {
    const section = document.querySelector('.step-flow-section');
    if (!section) return;

    const items = section.querySelectorAll('.step-flow-item');
    const slides = section.querySelectorAll('.step-flow-image-slide');
    const indicator = section.querySelector('.step-flow-pill-indicator');
    const container = section.querySelector('.step-flow-steps-list');
    
    if (!items.length || !slides.length || !indicator || !container) return;

    let currentIndex = 0;
    let timer = null;
    const AUTO_INTERVAL = 5500;
    let isPaused = false;

    function updatePillPosition() {
      const activeItem = items[currentIndex];
      if (!activeItem) return;

      const itemTop = activeItem.offsetTop;
      const itemHeight = activeItem.offsetHeight;

      indicator.style.transform = `translate3d(0, ${itemTop}px, 0)`;
      indicator.style.height = `${itemHeight}px`;
    }

    function setActiveStep(index, isUserAction = false) {
      if (index < 0 || index >= items.length) return;
      currentIndex = index;

      // Update text items
      items.forEach((item, i) => {
        if (i === currentIndex) {
          item.classList.add('is-active');
          item.setAttribute('aria-selected', 'true');
        } else {
          item.classList.remove('is-active');
          item.setAttribute('aria-selected', 'false');
        }
      });

      // Update image slides
      slides.forEach((slide, i) => {
        if (i === currentIndex) {
          slide.classList.add('is-active');
        } else {
          slide.classList.remove('is-active');
        }
      });

      // Move sliding pill
      updatePillPosition();

      // Reset progress animation
      section.classList.remove('is-animating');
      // Trigger reflow
      void indicator.offsetWidth;
      if (!isPaused) {
        section.classList.add('is-animating');
      }

      if (isUserAction) {
        resetTimer();
      }
    }

    function nextStep() {
      const nextIdx = (currentIndex + 1) % items.length;
      setActiveStep(nextIdx, false);
    }

    function startTimer() {
      stopTimer();
      section.classList.add('is-animating');
      timer = setInterval(() => {
        if (!isPaused) {
          nextStep();
        }
      }, AUTO_INTERVAL);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      section.classList.remove('is-animating');
    }

    function resetTimer() {
      stopTimer();
      startTimer();
    }

    // Attach listeners to step items
    items.forEach((item, index) => {
      // Hover activates the step (just like in Framer's onMouseEnter handler)
      item.addEventListener('mouseenter', () => {
        setActiveStep(index, true);
      });

      // Click/tap activates
      item.addEventListener('click', (e) => {
        setActiveStep(index, true);
      });

      // Keyboard focus/enter
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveStep(index, true);
        }
      });
    });

    // Pause on hover
    section.addEventListener('mouseenter', () => {
      isPaused = true;
      section.classList.remove('is-animating');
    });

    section.addEventListener('mouseleave', () => {
      isPaused = false;
      section.classList.add('is-animating');
    });

    // Resize observer / window resize to recalculate pill position
    window.addEventListener('resize', () => {
      requestAnimationFrame(updatePillPosition);
    });

    // Initialize initial state
    setActiveStep(0, false);
    startTimer();

    // Re-adjust after images and fonts load
    window.addEventListener('load', () => {
      updatePillPosition();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStepFlow);
  } else {
    initStepFlow();
  }
})();
