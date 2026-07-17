const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/next/dist/bin/next');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  if (!content.includes('filter(arg => arg !== \'--no-lint\')')) {
    // Insert process.argv filtering right after "use strict";
    content = content.replace(
      '"use strict";',
      '"use strict";\nprocess.argv = process.argv.filter(arg => arg !== "--no-lint");'
    );
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully patched next bin to support/ignore --no-lint');
  } else {
    console.log('next bin is already patched');
  }
} else {
  console.warn('next bin not found at', targetPath);
}
