#!/usr/bin/env node

import('../dist/cli/index.js').catch((err) => {
  console.error('Failed to start claude-ecosystem:', err.message);
  process.exit(1);
});
