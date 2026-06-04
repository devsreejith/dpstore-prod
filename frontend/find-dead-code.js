const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const allTsxFiles = getAllFiles('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

function countReferences(targetName) {
  let count = 0;
  for (const file of allTsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(targetName)) {
      count++;
    }
  }
  return count;
}

const pages = fs.readdirSync('./src/pages').filter(f => f.endsWith('.tsx'));
console.log('--- PAGES ---');
for (const page of pages) {
  const name = path.basename(page, '.tsx');
  if (name === 'index' || name === '_app' || name === '_document' || name === '404') continue;
  const count = countReferences('/' + name);
  console.log(`${page}: ${count} references`);
}

console.log('--- CONTAINERS ---');
const containers = fs.readdirSync('./src/containers').filter(f => f.endsWith('.tsx'));
for (const container of containers) {
  const name = path.basename(container, '.tsx');
  const count = countReferences(name);
  if (count === 0) console.log(`${container}: ${count} references`);
}

console.log('--- MOCK APIs ---');
const apis = fs.readdirSync('./public/api').filter(f => f.endsWith('.json'));
for (const api of apis) {
  const count = countReferences(api);
  if (count === 0) console.log(`${api}: ${count} references`);
}

console.log('--- DONE ---');
