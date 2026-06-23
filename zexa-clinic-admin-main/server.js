const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Enable Cross-Origin Resource Sharing (CORS) for public site submissions
app.use(cors());

// Ensure local data folder exists (uses Render persistent disk path if available)
const dataDir = process.env.RENDER_DISK_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const appointmentsPath = path.join(dataDir, 'appointments.json');
if (!fs.existsSync(appointmentsPath)) {
  fs.writeFileSync(appointmentsPath, JSON.stringify([]));
}

const patientsPath = path.join(dataDir, 'patients.json');
const doctorsPath = path.join(dataDir, 'doctors.json');
const departmentsPath = path.join(dataDir, 'departments.json');

[patientsPath, doctorsPath, departmentsPath].forEach(p => {
  if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify([]));
});

// Parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
// Subdomain / Host Routing Middleware
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const isSubdomainAdmin = host.toLowerCase().startsWith('admin.');
  const isLocalDev = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.123.105.');

  if (isSubdomainAdmin) {
    // If accessing the root of the admin subdomain, redirect to the login page
    if (req.path === '/' || req.path === '/index.html') {
      return res.redirect('/admin/login.html');
    }
  } else if (!isLocalDev) {
    // In production, block direct access to the /admin/ path on the public domain
    if (req.path.startsWith('/admin/')) {
      return res.status(404).send('Page not found');
    }
  }
  next();
});


// Setup Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-random-secret-key-zexa-clinic',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,               // Prevents client-side JS from reading cookie (prevents XSS hijacking)
      sameSite: 'strict',           // Protects against CSRF attacks
      secure: false,                // Set to true in production if running HTTPS
      maxAge: 30 * 60 * 1000,       // 30 minutes session expiry
    },
  })
);

// Rate Limiter for Login Attempts to protect against Brute Force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5,                  // limit each IP to 5 login requests per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,    // Disable the `X-RateLimit-*` headers
});

// Authentication checkpoint middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized access. Please log in.' });
  }
};

// API: Book an appointment
app.post('/api/appointments', (req, res) => {
  try {
    const { name, phone, email, date, department } = req.body;

    // Server-Side Input Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Preferred date is required.' });
    }
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: 'Appointment date cannot be in the past.' });
    }
    if (!department || department === '') {
      return res.status(400).json({ error: 'Department selection is required.' });
    }

    // Load, append and save appointments
    const appointmentsData = fs.readFileSync(appointmentsPath, 'utf8');
    const appointments = JSON.parse(appointmentsData);

    const newAppointment = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      date,
      department,
      createdAt: new Date().toISOString(),
    };

    appointments.push(newAppointment);
    fs.writeFileSync(appointmentsPath, JSON.stringify(appointments, null, 2));

    res.status(201).json({ message: 'Appointment requested successfully.', appointment: newAppointment });
  } catch (error) {
    console.error('Error saving appointment:', error);
    res.status(500).json({ error: 'Internal server error. Failed to save appointment.' });
  }
});

// API: Admin Login
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const configuredUser = process.env.ADMIN_USER || 'admin';
  const configuredHash = process.env.ADMIN_PASS_HASH;

  if (username !== configuredUser) {
    // Return generic message to prevent username enumeration
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  bcrypt.compare(password, configuredHash, (err, matches) => {
    if (err || !matches) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Authentication Success
    req.session.isAdmin = true;
    req.session.username = username;
    res.json({ message: 'Login successful.' });
  });
});

// API: Admin Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});


// Generic CRUD Route Generator
function createCrudRoutes(app, routeName, filePath) {
  app.get(`/api/admin/${routeName}`, requireAdmin, (req, res) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: `Failed to retrieve ${routeName}` });
    }
  });

  app.post(`/api/admin/${routeName}`, requireAdmin, (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const newItem = { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), ...req.body, createdAt: new Date().toISOString() };
      data.push(newItem);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.status(201).json(newItem);
    } catch (e) {
      res.status(500).json({ error: `Failed to save ${routeName}` });
    }
  });

  app.delete(`/api/admin/${routeName}/:id`, requireAdmin, (req, res) => {
    try {
      let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data = data.filter(item => item.id !== req.params.id);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.json({ message: 'Deleted successfully' });
    } catch (e) {
      res.status(500).json({ error: `Failed to delete ${routeName}` });
    }
  });
}

createCrudRoutes(app, 'patients', patientsPath);
createCrudRoutes(app, 'doctors', doctorsPath);
createCrudRoutes(app, 'departments', departmentsPath);
createCrudRoutes(app, 'appointments', appointmentsPath);

// Specific PUT route for Appointment Status
app.put('/api/admin/appointments/:id/status', requireAdmin, (req, res) => {
  try {
    let data = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
    const { status } = req.body;
    const index = data.findIndex(item => item.id === req.params.id);
    if (index !== -1) {
      data[index].status = status;
      fs.writeFileSync(appointmentsPath, JSON.stringify(data, null, 2));
      res.json(data[index]);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to update' });
  }
});


// View routing: Admin Dashboard protection
app.get('/admin/dashboard.html', (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    next(); // Authorized, proceed to serve dashboard.html
  } else {
    res.redirect('/admin/login.html'); // Redirect to login
  }
});

// Static assets serving with custom headers to prevent browser caching of app.js
app.use(express.static(path.join(__dirname), {
  etag: false,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Fallback path redirects to admin login page
app.get('*', (req, res) => {
  res.redirect('/admin/login.html');
});

// Listen
app.listen(PORT, () => {
  console.log(`Zexa Clinic secure backend running on http://localhost:${PORT}`);
});
