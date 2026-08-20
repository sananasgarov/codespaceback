const Language = require('../enums/language');
const Semaphore = require('../utils/semaphore');
const logger = require('../utils/logger');
const env = require('../config/env');

// Replaces the old docker.service.js. That version shelled out to a local
// `docker` CLI (`spawn('docker', [...])`) to run untrusted student code in a
// container - it needed a Docker daemon on the same host, which works on a
// dev machine with Docker Desktop but not on Render/Vercel, where the app
// runs in a container that has no Docker socket at all. Piston's public API
// (the obvious hosted replacement) went whitelist-only in Feb 2026 and
// rejects individual/non-commercial projects, so this calls Wandbox
// (https://wandbox.org/api) instead - a free, keyless, public compile-and-run
// API that's been running the same way for years.
const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const TIMEOUT_MS = env.execution.timeoutSeconds * 1000;
const QUEUE_WAIT_MS = env.execution.queueWaitSeconds * 1000;

// Compiler ids from https://wandbox.org/api/list.json - re-check that list if
// these ever start 404ing (Wandbox retires old toolchain versions over time).
// Verified live against that endpoint on 2026-08-20.
const COMPILERS = {
  [Language.PYTHON]: 'cpython-3.9.20',
  [Language.JAVA]: 'openjdk-jdk-21+35',
  [Language.JAVASCRIPT]: 'nodejs-20.17.0',
  [Language.TYPESCRIPT]: 'typescript-5.6.2',
  [Language.C]: 'gcc-13.2.0-c',
  [Language.CPP]: 'gcc-13.2.0',
  // Not dotnetcore-8.0.402: verified live on 2026-08-20 that `dotnet new
  // console` currently core-dumps on Wandbox's box (file-size ulimit hit
  // during project scaffolding) - 6.0.425 scaffolds a lighter template and
  // actually runs, still supports top-level statements.
  [Language.CSHARP]: 'dotnetcore-6.0.425',
  [Language.PHP]: 'php-8.3.12',
  [Language.GO]: 'go-1.23.2',
  [Language.SQL]: 'sqlite-3.46.1',
};

// Wandbox has no documented rate limit, but it's someone else's free service -
// keep capping concurrent requests the same way the old Docker version capped
// concurrent containers, so we stay a good citizen instead of hammering it.
const semaphore = new Semaphore(env.execution.maxConcurrentContainers);

async function runCode(code, language) {
  let acquired = false;
  try {
    logger.info(`Waiting for available execution slot... available=${semaphore.availablePermits()}`);

    acquired = await semaphore.tryAcquire(QUEUE_WAIT_MS);

    if (!acquired) {
      logger.warn(`Queue timeout: no available execution slot after ${env.execution.queueWaitSeconds}s`);
      return 'Error: Server is busy, please try again in a few seconds';
    }

    logger.info(`Execution slot acquired. available=${semaphore.availablePermits()}`);

    return language === Language.JAVA ? await runJava(code) : await runGeneric(code, language);
  } catch (err) {
    logger.error('CodeRunner error:', err);
    return `Error: ${err.message}`;
  } finally {
    if (acquired) {
      semaphore.release();
      logger.info(`Execution slot released. available=${semaphore.availablePermits()}`);
    }
  }
}

// Every language except Java is a drop-in for Wandbox's default `code` field
// - none of them care that the file it gets written to (`prog.<ext>`) doesn't
// match anything in the source (no javac-style public-class-name rule), so
// one function covers Python, JS, TS, C, C++, C#, PHP, Go and SQL alike.
async function runGeneric(code, language) {
  const result = await callWandbox({ code, compiler: COMPILERS[language] });
  return toResultString(result);
}

async function runJava(code) {
  // Wandbox always writes the top-level `code` field to a fixed file
  // (prog.java), which javac rejects for any `public class X` (the file name
  // has to match the public class name). Submitting the real source through
  // `codes[]` under its actual class name - with that file name appended as
  // an extra javac argument via `compiler-option-raw` - works around it.
  const className = extractClassName(code);
  const result = await callWandbox({
    code: '',
    codes: [{ file: `${className}.java`, code }],
    compiler: COMPILERS[Language.JAVA],
    'compiler-option-raw': `${className}.java`,
  });
  return toResultString(result);
}

async function callWandbox(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(WANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Wandbox responded with HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Execution timed out (${env.execution.timeoutSeconds}s limit)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Mirrors the old docker.service.js contract exactly: a single string,
// prefixed with "Error:" on failure, so execution.service.js (which branches
// on `dockerResult.startsWith('Error:')`) needed no changes at all.
function toResultString(result) {
  const failed = result.status !== '0' || Boolean(result.compiler_error);

  if (failed) {
    const detail = (result.compiler_error || result.program_error || 'Unknown error').trim();
    return `Error:\n${detail}`;
  }

  const output = (result.program_output || '').trim();
  return output === '' ? '(no output)' : output;
}

function extractClassName(code) {
  for (const rawLine of code.split('\n')) {
    const line = rawLine.trim();
    if (line.includes('public class ')) {
      const parts = line.split('public class ');
      if (parts.length > 1) {
        const name = parts[1].split(/[\s{]/)[0].trim();
        if (name !== '') {
          logger.debug(`Extracted class name: ${name}`);
          return name;
        }
      }
    }
  }
  logger.warn("Class name not found, using 'Main' as default");
  return 'Main';
}

module.exports = { runCode };
