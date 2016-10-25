// This propagates the version from package.json to Meteor plugins.

const version = require('../../package.json').version;
const fs = require('fs');

const paths = ['./plugins/localstorage/package.js'];
paths.forEach((path) => {
    let packageJs = fs.readFileSync(path, 'UTF-8');
    packageJs = packageJs.replace(/(version: ')([^']+)'/, `$1${version}'`);
    fs.writeFileSync(path, packageJs);
});
let readme = fs.readFileSync('README.md', 'UTF-8');
readme = readme.replace(/(version": ")([^"]+)"/, `$1${version}"`);
fs.writeFileSync('README.md', readme);
