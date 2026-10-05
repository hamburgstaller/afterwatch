const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
if (manifest.version !== pkg.version) throw new Error('Version mismatch');
if (manifest.description.length > 132) throw new Error('Manifest description is too long');
if (pkg.license !== 'MIT' || !read('LICENSE').startsWith('MIT License')) throw new Error('License mismatch');
const html = read('popup.html');
if (!html.includes('lang="en"') || !html.includes(`<title>${manifest.name}</title>`)) throw new Error('Popup identity mismatch');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
if (scripts.some(file => file.startsWith('dev/') || file.includes('://'))) throw new Error('Development or remote script in production');
const required = [manifest.action.default_popup, 'popup.css', ...scripts, 'LICENSE', 'README.md', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'ROADMAP.md', 'AUDIT.md'];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
if (!scripts.includes('i18n.js')) throw new Error('Missing local translation catalog');
for (const file of [...scripts, 'dev/preview.js', 'dev/server.cjs', ...fs.readdirSync(path.join(root,'tests')).filter(file=>file.endsWith('.test.cjs')).map(file=>`tests/${file}`)]) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], {stdio: 'pipe'});
}
console.log(`Release metadata and assets valid: ${manifest.name} ${manifest.version}; description ${manifest.description.length} characters`);
