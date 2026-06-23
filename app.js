document.addEventListener('DOMContentLoaded', () => {
  // Define backend URL dynamically
  const BACKEND_URL = (window.location.hostname.includes('localhost') || 
                       window.location.hostname.includes('127.0.0.1') || 
                       window.location.hostname.includes('10.123.105.') || 
                       window.location.hostname.includes('loca.lt') ||
                       window.location.protocol === 'file:')
    ? 'http://localhost:8000' 
    : 'https://zexa-clinic.onrender.com';

  // Update Admin Login link
  const adminLoginLink = document.getElementById('adminLoginLink');
  if (adminLoginLink) {
    adminLoginLink.href = `${BACKEND_URL}/admin/login.html`;
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

  // --- Intersection Observer (Scroll Reveal) ---
  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // Stop observing once revealed
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before element enters viewport
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback if browser doesn't support IntersectionObserver
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // --- Testimonials Slider Logic ---
  const track = document.getElementById('testimonialsTrack');
  const slides = Array.from(track.children);
  const nextBtn = document.getElementById('nextTestimonial');
  const prevBtn = document.getElementById('prevTestimonial');
  const dotsContainer = document.getElementById('testimonialsDots');
  let currentIndex = 0;

  // Create dot indicators
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.classList.add('testimonials-dot');
    if (index === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dotsContainer.appendChild(dot);

    dot.addEventListener('click', () => {
      moveToSlide(index);
    });
  });

  const dots = Array.from(dotsContainer.children);

  const moveToSlide = (index) => {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    track.style.transform = `translateX(-${index * 100}%)`;
    dots[currentIndex].classList.remove('active');
    dots[index].classList.add('active');
    currentIndex = index;
  };

  nextBtn.addEventListener('click', () => moveToSlide(currentIndex + 1));
  prevBtn.addEventListener('click', () => moveToSlide(currentIndex - 1));

  // Auto scroll testimonials slide every 6 seconds
  let slideInterval = setInterval(() => moveToSlide(currentIndex + 1), 6000);
  
  // Pause auto scroll on hover/interaction
  const stopAutoScroll = () => clearInterval(slideInterval);
  const startAutoScroll = () => {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => moveToSlide(currentIndex + 1), 6000);
  };
  
  track.parentElement.addEventListener('mouseenter', stopAutoScroll);
  track.parentElement.addEventListener('mouseleave', startAutoScroll);

  // --- Booking Form Interactive Validator & Submission Mock ---
  const form = document.getElementById('appointmentForm');
  const patientName = document.getElementById('patientName');
  const patientPhone = document.getElementById('patientPhone');
  const patientEmail = document.getElementById('patientEmail');
  const preferredDate = document.getElementById('preferredDate');
  const department = document.getElementById('department');
  const submitBtn = document.getElementById('submitBtn');

  // Set min date of picker to today
  const today = new Date().toISOString().split('T')[0];
  preferredDate.setAttribute('min', today);

  const showError = (inputElement, errorElement, show = true) => {
    if (show) {
      inputElement.classList.add('error');
      errorElement.style.display = 'block';
    } else {
      inputElement.classList.remove('error');
      errorElement.style.display = 'none';
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Validate Name
    if (patientName.value.trim() === '') {
      showError(patientName, document.getElementById('patientNameError'), true);
      isValid = false;
    } else {
      showError(patientName, document.getElementById('patientNameError'), false);
    }

    // Validate Phone (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(patientPhone.value.trim())) {
      showError(patientPhone, document.getElementById('patientPhoneError'), true);
      isValid = false;
    } else {
      showError(patientPhone, document.getElementById('patientPhoneError'), false);
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail.value.trim())) {
      showError(patientEmail, document.getElementById('patientEmailError'), true);
      isValid = false;
    } else {
      showError(patientEmail, document.getElementById('patientEmailError'), false);
    }

    // Validate Date
    if (preferredDate.value === '') {
      showError(preferredDate, document.getElementById('preferredDateError'), true);
      isValid = false;
    } else {
      // Confirm date is not in past
      const selectedDate = new Date(preferredDate.value);
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      
      if (selectedDate < todayDate) {
        showError(preferredDate, document.getElementById('preferredDateError'), true);
        isValid = false;
      } else {
        showError(preferredDate, document.getElementById('preferredDateError'), false);
      }
    }

    // Validate Department
    if (department.value === '') {
      showError(department, document.getElementById('departmentError'), true);
      isValid = false;
    } else {
      showError(department, document.getElementById('departmentError'), false);
    }

    return isValid;
  };

  // Real-time input check cleanup on typing/focusout
  const inputs = [patientName, patientPhone, patientEmail, preferredDate, department];
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const errorId = `${input.id}Error`;
      const errorEl = document.getElementById(errorId);
      if (errorEl) showError(input, errorEl, false);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Form is valid - Submit to secure Express backend
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="animation: rotateSpinner 1s linear infinite; margin-right: 8px; vertical-align: middle; fill: none; stroke: currentColor; stroke-width: 4; stroke-linecap: round;">
        <circle cx="25" cy="25" r="20" stroke-dasharray="80, 200" stroke-dashoffset="0"></circle>
      </svg>
      Scheduling...
    `;
    
    // Inject keyframes style block for loading spinner if not existing
    if (!document.getElementById('spinnerAnimation')) {
      const style = document.createElement('style');
      style.id = 'spinnerAnimation';
      style.innerHTML = `
        @keyframes rotateSpinner {
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    const payload = {
      name: patientName.value,
      phone: patientPhone.value,
      email: patientEmail.value,
      date: preferredDate.value,
      department: department.value
    };



    fetch(`${BACKEND_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request appointment.');
      }
      return data;
    })
    .then((data) => {
      // Toast notification display
      const toast = document.getElementById('bookingToast');
      const toastMessage = document.getElementById('toastMessage');
      
      toastMessage.textContent = `Thank you ${patientName.value.split(' ')[0]}. We have received your booking request for ${department.value} on ${preferredDate.value}. A representative will contact you at ${patientPhone.value} shortly.`;
      
      toast.classList.add('show');
      
      // Reset form controls
      form.reset();
      
      // Hide toast notification after 6 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 6000);
    })
    .catch((err) => {
      alert(err.message || 'An unexpected error occurred. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  });

});

