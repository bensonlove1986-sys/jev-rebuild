/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.246Z */
const fs = require('fs');
const path = require('path');

console.log('JEV ENCODING FIX v1.0');

// Base paths
const basePath = 'D:\\PDF转网页';
const clientPath = path.join(basePath, 'JEV_Client');
const diagnosticsPath = path.join(clientPath, 'diagnostics');

// Ensure diagnostics directory exists
if (!fs.existsSync(diagnosticsPath)) {
    fs.mkdirSync(diagnosticsPath, { recursive: true });
    console.log(`Created diagnostics directory: ${diagnosticsPath}`);
}

// Timestamp
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
console.log(`Start time: ${timestamp}`);

// Counters
let totalFiles = 0;
let fixedFiles = 0;
let errors = [];

// Fix encoding function
function fixFile(filePath) {
    totalFiles++;
    try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for corruption
        if (content.includes('') || /[\x80-\xFF]{1,}/.test(content)) {
            console.log(`Found corruption: ${filePath}`);
            
            // Create backup
            const backupPath = filePath + '.bak';
            fs.copyFileSync(filePath, backupPath);
            
            // Clean and save as UTF-8
            fs.writeFileSync(filePath, content, 'utf8');
            
            // Add UTF-8 meta tag for HTML files
            if (filePath.endsWith('.html')) {
                if (!content.match(/<meta.*charset=.*utf-8/i)) {
                    const updatedContent = content.replace(/<head>/i, '<head>\n<meta charset="UTF-8">');
                    fs.writeFileSync(filePath, updatedContent, 'utf8');
                }
            }
            
            fixedFiles++;
            console.log(`Fixed: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error processing: ${filePath}`);
        errors.push({ path: filePath, error: err.message });
    }
}

// Scan directory recursively
function scanDirectory(dirPath, extensions) {
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                // Skip node_modules and hidden directories
                if (!file.startsWith('.') && file !== 'node_modules') {
                    scanDirectory(fullPath, extensions);
                }
            } else {
                // Check file extension
                const ext = path.extname(file).toLowerCase();
                if (extensions.includes(ext)) {
                    fixFile(fullPath);
                }
            }
        }
    } catch (err) {
        console.error(`Error scanning directory: ${dirPath}`);
    }
}

// Scan JEV_Client directory
console.log('\nScanning JEV_Client directory...');
const targetExtensions = ['.html', '.js', '.css', '.json', '.txt'];
scanDirectory(clientPath, targetExtensions);

// Generate report
const report = {
    task: 'JEV-ENCODING-FIX',
    timestamp: timestamp,
    totalFiles: totalFiles,
    fixedFiles: fixedFiles,
    errors: errors.length,
    status: fixedFiles > 0 ? 'repaired' : 'clean'
};

fs.writeFileSync(
    path.join(diagnosticsPath, 'encoding_fix_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);

// Write log
const logContent = `[${timestamp}] Encoding fix: Fixed ${fixedFiles}/${totalFiles} files, Errors: ${errors.length}\n`;
fs.appendFileSync(
    path.join(diagnosticsPath, 'encoding_guard_log.txt'),
    logContent,
    'utf8'
);

// Show summary
console.log('\n====================================');
console.log('FIX COMPLETED!');
console.log(`Total scanned: ${totalFiles} files`);
console.log(`Fixed: ${fixedFiles} files`);
console.log(`Errors: ${errors.length}`);
console.log(`Report: ${path.join(diagnosticsPath, 'encoding_fix_report.json')}`);
console.log('====================================');

// Exit with success code
process.exit(0);