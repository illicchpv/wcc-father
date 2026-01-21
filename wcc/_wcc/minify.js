const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'BaseComponent.js');
const destPath = path.join(__dirname, 'BaseComponent.min.js');

const src = fs.readFileSync(srcPath, 'utf8');
let out = '';

let state = 'code'; // code, str_s, str_d, str_t, regex, comment_line, comment_block
let i = 0;

function isRegexStart(text, pos) {
    let p = pos - 1;
    while (p >= 0 && /\s/.test(text[p])) p--;
    if (p < 0) return true; 
    const c = text[p];
    // Check for operators that can precede a regex
    if ('({[=,;:!?&|'.includes(c)) return true;
    
    // Check for keywords
    // We look back for keywords. 
    // Need to ensure the keyword is not part of a larger identifier (e.g. 'areturn')
    // and is not a property access (e.g. '.return')
    
    // Grab last 10 chars
    const chunk = text.slice(Math.max(0, p - 10), p + 1);
    
    if (/(^|[^\w$.])(return|case|throw|else|typeof|void|delete|await)$/.test(chunk)) {
        return true;
    }
    
    return false;
}

while (i < src.length) {
    const char = src[i];
    const next = src[i+1];

    if (state === 'code') {
        if (char === '/' && next === '/') {
            state = 'comment_line';
            i += 2;
        } else if (char === '/' && next === '*') {
            state = 'comment_block';
            i += 2;
        } else if (char === "'") {
            state = 'str_s';
            out += char;
            i++;
        } else if (char === '"') {
            state = 'str_d';
            out += char;
            i++;
        } else if (char === '`') {
            state = 'str_t';
            out += char;
            i++;
        } else if (char === '/' && isRegexStart(src, i)) {
            state = 'regex';
            out += char;
            i++;
        } else if (/\s/.test(char)) {
            // Collapse whitespace
            if (out.length > 0 && !/\s$/.test(out)) {
                out += ' ';
            }
            i++;
        } else {
            out += char;
            i++;
        }
    } else if (state === 'comment_line') {
        if (char === '\n') {
            state = 'code';
            // Do not add space here, the loop will handle next char
        }
        i++;
    } else if (state === 'comment_block') {
        if (char === '*' && next === '/') {
            state = 'code';
            i += 2;
            // Treat comment block as space to avoid sticking tokens
            if (out.length > 0 && !/\s$/.test(out)) {
                out += ' ';
            }
        } else {
            i++;
        }
    } else if (state === 'str_s') {
        out += char;
        if (char === '\\') { 
            if (i+1 < src.length) out += src[i+1]; 
            i += 2; 
        } else { 
            if (char === "'") state = 'code'; 
            i++; 
        }
    } else if (state === 'str_d') {
        out += char;
        if (char === '\\') { 
            if (i+1 < src.length) out += src[i+1]; 
            i += 2; 
        } else { 
            if (char === '"') state = 'code'; 
            i++; 
        }
    } else if (state === 'str_t') {
        out += char;
        if (char === '\\') { 
            if (i+1 < src.length) out += src[i+1]; 
            i += 2; 
        } else { 
            if (char === '`') state = 'code'; 
            i++; 
        }
    } else if (state === 'regex') {
        out += char;
        if (char === '\\') { 
            if (i+1 < src.length) out += src[i+1]; 
            i += 2; 
        } else { 
            if (char === '/') { 
                state = 'code'; 
            }
            i++; 
        }
    }
}

// Post-processing to clean up spaces around punctuation?
// The user asked for "methods and properties in one line".
// With space collapsing, we have `foo() { bar(); }`. This is fine.
// But we might have `foo () {`.
// Let's rely on the simple space collapse. It's safe.

// Ensure export matches expectation
// const _template = null;export class ...
// My parser puts space: `const _template = null; export class ...`
// This is fine.

fs.writeFileSync(destPath, out.trim());
