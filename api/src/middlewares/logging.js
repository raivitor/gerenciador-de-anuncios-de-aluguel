import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função que garante que o diretório de logs exista
function ensureLogDirectory() {
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

// Função que inicializa os middlewares de log
function initLogger(env = process.env.NODE_ENV || 'development') {
  const logFormat =
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

  const logsDir = ensureLogDirectory();
  const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), {
    flags: 'a',
  });

  const requestLogger = morgan(logFormat, {
    stream: accessLogStream,
    skip: req => req.path === '/health',
  });

  // Middleware de log detalhado
  const detailedLogger =
    env !== 'production'
      ? (req, res, next) => {
          const start = Date.now();

          console.log('\n=== Nova Requisição ===');
          console.log(`Método: ${req.method}`);
          console.log(`URL: ${req.url}`);

          if (req.body && Object.keys(req.body).length > 0) {
            const bodyToLog = { ...req.body };
            if (req.files) {
              Object.keys(req.files).forEach(key => {
                if (bodyToLog[key]) {
                  bodyToLog[key] = '[ARQUIVO]';
                }
              });
            }
            console.log('Body:', JSON.stringify(bodyToLog, null, 2));
          } else {
            console.log('Body:', JSON.stringify(req.body, null, 2));
          }

          const originalJson = res.json;
          res.json = function (data) {
            const duration = Date.now() - start;
            console.log('\n=== Resposta ===');
            console.log(`Status: ${res.statusCode}`);
            console.log(`Tempo de resposta: ${duration}ms`);
            console.log('Data:', JSON.stringify(data, null, 2));
            console.log('==================\n');
            return originalJson.call(this, data);
          };

          next();
        }
      : (req, res, next) => next(); // Produção: middleware vazio

  return { requestLogger, detailedLogger };
}

export { initLogger };
