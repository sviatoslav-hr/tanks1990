const fs = require('fs/promises');
const path = require('path');

const LIST_FILENAME = 'list.json';
const PUBLIC_PATH = path.join(__dirname, '..', 'public');
const IGNORE_FIELS = ['.DS_Store', LIST_FILENAME, 'assets.html'];

let fileCounts = {};
let dirsCount = 0;

async function main() {
    const list = await readDir('.');
    await fs.writeFile(path.join(PUBLIC_PATH, LIST_FILENAME), JSON.stringify(list, null, 2));
    printResults();
}

async function readDir(dirPath) {
    const result = {};
    const files = await fs.readdir(path.join(PUBLIC_PATH, dirPath));
    for (const filename of files) {
        if (IGNORE_FIELS.includes(filename)) {
            continue;
        }
        const filePath = path.join(dirPath, filename);
        const stat = await fs.stat(path.join(PUBLIC_PATH, filePath));
        if (stat.isDirectory()) {
            result[filename] = await readDir(filePath);
            dirsCount++;
        } else {
            // TODO: Does it make sense to include the full path?
            result[filename] = filePath.replaceAll('\\', '/');
            const ext = extname(filename);
            fileCounts[ext] = (fileCounts[ext] || 0) + 1;
        }
    }
    return result;
}

function extname(filename) {
    const index = filename.lastIndexOf('.');
    if (index > -1 && index < filename.length - 1) {
        return filename.slice(index);
    }
    return filename;
}

function printResults() {
    let msg = 'Done! Found';
    const filesCountEntries = Object.entries(fileCounts);
    if (!filesCountEntries.length) {
        msg += ` 0 files, ${dirsCount} directories.`;
    } else {
        msg += `:\n  ${dirsCount} directories`;
    }
    filesCountEntries.sort((a, b) => b[1] - a[1]);
    for (const [ext, count] of filesCountEntries) {
        msg += `\n  ${count} ${ext} files`;
    }
    console.log(msg);
}

main().catch(console.error);
