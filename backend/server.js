require('dotenv').config();

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  logger.info(
    `Megthiran portal server running at http://localhost:${PORT}`
  );

  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});

server.on('error', (error) => {
  logger.error('Server failed to start.', {
    code: error.code,
    message: error.message,
  });

  console.error(error);

  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection.', {
    message:
      reason && reason.message
        ? reason.message
        : String(reason),

    stack: reason && reason.stack,
  });

  console.error(reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception.', {
    message: error.message,
    stack: error.stack,
  });

  console.error(error);

  process.exit(1);
});