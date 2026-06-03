const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

const frontendDir = path.resolve(
  __dirname,
  '..',
  'frontend'
);
const uploadsDir = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')
);

const devAllowedOrigins = new Set([
  `http://localhost:${config.port}`,
  `http://127.0.0.1:${config.port}`,

  'http://localhost:3000',
  'http://127.0.0.1:3000',

  'http://localhost:5173',
  'http://127.0.0.1:5173',

  'http://localhost:5500',
  'http://127.0.0.1:5500',
]);

function resolveCorsOrigin(origin, callback) {
  if (!origin || origin === 'null') {
    return callback(null, true);
  }

  if (
    config.frontendOrigin === '*' ||
    config.frontendOrigins.includes('*')
  ) {
    return callback(null, true);
  }

  if (config.frontendOrigins.includes(origin)) {
    return callback(null, true);
  }

  if (
    config.nodeEnv !== 'production' &&
    devAllowedOrigins.has(origin)
  ) {
    return callback(null, true);
  }

  return callback(
    new Error(
      `CORS blocked request from origin: ${origin}`
    )
  );
}

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '50kb' }));

app.use(express.urlencoded({ extended: true }));

app.use(
  morgan(
    config.nodeEnv === 'production'
      ? 'combined'
      : 'dev'
  )
);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'megthiran-student-dashboard',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/student', studentRoutes);

app.use('/uploads', express.static(uploadsDir));

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(
    path.join(frontendDir, 'index.html')
  );
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

module.exports = app;
