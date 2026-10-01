const fs = require('fs');
const s = fs.readFileSync('scratch_framer.js', 'utf8');

const compIdx = s.indexOf('const Component=');
console.log(s.slice(compIdx + 18000, compIdx + 24000));
