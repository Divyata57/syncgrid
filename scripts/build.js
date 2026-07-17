const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking if dependencies are installed...');
let needInstall = false;

try {
  require.resolve('next');
} catch (e) {
  console.log('Dependencies not found. Triggering npm install...');
  needInstall = true;
}

if (needInstall) {
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
  } catch (err) {
    console.error('Failed to install dependencies:', err);
    process.exit(1);
  }
}

console.log('Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma Client generated successfully.');
} catch (err) {
  console.error('Failed to generate Prisma Client:', err);
  process.exit(1);
}

console.log('Synchronizing database schema (Prisma DB Push)...');
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Database synchronized successfully.');
} catch (err) {
  console.error('Failed to synchronize database schema:', err);
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.error('Production database sync failed, aborting build.');
    process.exit(1);
  } else {
    console.log('Ignoring database sync failure in development environment.');
  }
}

console.log('Running next build...');
try {
  // Run Next.js build using the locally installed package
  const nextBinPath = path.join(__dirname, '../node_modules/next/dist/bin/next');
  execSync(`node "${nextBinPath}" build`, { stdio: 'inherit' });
  console.log('Build completed successfully.');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
