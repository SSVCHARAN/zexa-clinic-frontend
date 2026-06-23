document.addEventListener('DOMContentLoaded', () => {
  // Define backend URL dynamically
  const BACKEND_URL = (window.location.hostname.includes('localhost') || 
                       window.location.hostname.includes('127.0.0.1') || 
                       window.location.hostname.includes('10.123.105.') || 
                       window.location.hostname.includes('loca.lt') ||
                       window.location.protocol === 'file:')
    ? 'http://localhost:8000' 
    : 'https://zexa-clinic-backend.onrender.com';

  // Update Admin Login link
  const adminLoginLink = document.getElementById('adminLoginLink');
  if (adminLoginLink) {
    adminLoginLink.href = `${BACKEND_URL}/admin/login.html?returnUrl=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
  }

  // --- Sticky Navigation Scroll Listener ---
  const header = document.getElementById('header');
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Run initially to set class if page loaded mid-scroll

  // --- Mobile Drawer Control ---
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');

  const openDrawer = () => {
    mobileNavToggle.classList.add('active');
    mobileDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    mobileNavToggle.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    mobileNavToggle.classList.remove('active');
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    mobileNavToggle.setAttribute('aria-expanded', 'false');
  };

  mobileNavToggle.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.contains('open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  drawerOverlay.addEventListener('click', closeDrawer);
  
  // Expose closeDrawer to global scope for nav links with onclick handler
  window.closeDrawer = closeDrawer;

  // --- Lenis Smooth Scroll ---
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // --- GSAP Animations ---
  gsap.registerPlugin(ScrollTrigger);

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time)=>{
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // 1. Hero Parallax
  gsap.to('.hero-glow-blob', {
    yPercent: 30,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to('.hero-image-wrapper', {
    yPercent: -20,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  // 2. Horizontal Scroll Section
  const track = document.querySelector('.horizontal-track');
  const cards = gsap.utils.toArray('.horizontal-track .why-card');
  
  if (track && cards.length > 0) {
    function getScrollAmount() {
      let trackWidth = track.scrollWidth;
      return -(trackWidth - window.innerWidth + window.innerWidth * 0.1);
    }

    const tween = gsap.to(track, {
      x: getScrollAmount,
      ease: "none"
    });

    ScrollTrigger.create({
      trigger: ".horizontal-scroll-section",
      start: "top top",
      end: () => `+=${getScrollAmount() * -1}`,
      pin: true,
      animation: tween,
      scrub: 1,
      invalidateOnRefresh: true
    });
  }

  // 3. Staggered Reveals
  const fadeUpElements = gsap.utils.toArray('.service-card, .doctor-card, .contact-card-box');
  fadeUpElements.forEach((el) => {
    gsap.fromTo(el, 
      { y: 50, opacity: 0 },
      {
        y: 0, 
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });

  const fadeSides = gsap.utils.toArray('.about-visual-group, .about-content');
  fadeSides.forEach((el, index) => {
    gsap.fromTo(el,
      { x: index === 0 ? -50 : 50, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about-section",
          start: "top 75%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });
}); // End of DOMContentLoaded
