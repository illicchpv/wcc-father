const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

// Проверяем наличие флага --clear
const isClearMode = process.argv.includes('--clear');

if (isClearMode) {
  console.log('Mode: CLEAR (resetting templates to empty strings)');
} else {
  console.log('Mode: INLINE (embedding HTML into JS)');
}

console.log('Searching for components in:', PROJECT_ROOT);

const IGNORE_DIRS = ['node_modules', 'scripts', 'css', 'img', 'js'];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  // 1. Проверяем текущую директорию (CWD или рекурсивный вызов)
  // Если это директория компонента (имя папки = имя js/html файлов)
  const dirName = path.basename(dir);
  const jsFileName = `${dirName}.js`;
  const htmlFileName = `${dirName}.html`;
  const jsPath = path.join(dir, jsFileName);
  const htmlPath = path.join(dir, htmlFileName);

  if (fs.existsSync(jsPath) && fs.existsSync(htmlPath)) {
    try {
      processComponent(jsPath, htmlPath);
    } catch (e) {
      console.error(`Error processing ${jsFileName}:`, e);
    }
  }

  // 2. Рекурсивно обходим подпапки
  const entries = fs.readdirSync(dir, {withFileTypes: true});

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Игнорируем папки, начинающиеся с точки, и те, что в списке IGNORE_DIRS
      if (entry.name.startsWith('.') || IGNORE_DIRS.includes(entry.name)) {
        continue;
      }

      // Рекурсия
      processDirectory(fullPath);
    }
  }
}

function processComponent(jsPath, htmlPath) {
  console.log(`Processing: ${path.basename(jsPath)}`);

  let jsContent = fs.readFileSync(jsPath, 'utf8');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Проверка наследования от BaseComponent
  if (!jsContent.includes('extends BaseComponent')) {
    console.log(`  Skipped: does not extend BaseComponent`);
    return;
  }

  // Экранирование HTML содержимого для вставки в template literal
  // 1. Экранируем обратные слэши
  let escapedHtml = htmlContent.replace(/\\/g, '\\\\');
  // 2. Экранируем обратные кавычки
  escapedHtml = escapedHtml.replace(/`/g, '\\`');
  // 3. Экранируем ${} чтобы они не выполнялись сразу (интерполяция)
  escapedHtml = escapedHtml.replace(/\$\{/g, '\\${');

  // Паттерн поиска объявления myTemplate
  // Ищем: const myTemplate = `...`; или const myTemplate = ""; или const myTemplate = '';
  // Используем [\s\S] для матчинга переносов строк
  const templateRegex = /(const\s+myTemplate\s*=\s*)(?:`[\s\S]*?`|"[^"]*"|'[^']*')(\s*;)/;

  if (templateRegex.test(jsContent)) {
    let newContent;

    if (isClearMode) {
      // Режим очистки: myTemplate = ``;
      // $1 - "const myTemplate = "
      // $2 - ";"
      newContent = jsContent.replace(templateRegex, `$1\`\`$2`);
    } else {
      // Режим вставки: myTemplate = `...html...`;
      newContent = jsContent.replace(templateRegex, `$1\`${escapedHtml}\`$2`);
    }

    if (newContent !== jsContent) {
      fs.writeFileSync(jsPath, newContent, 'utf8');
      const action = isClearMode ? 'Cleared' : 'Updated';
      console.log(`  ${action} myTemplate in ${path.basename(jsPath)}`);
    } else {
      console.log(`  No changes needed`);
    }
  } else {
    console.warn(`  Warning: 'const myTemplate = ...;' not found in ${path.basename(jsPath)}`);
  }
}

if (fs.existsSync(PROJECT_ROOT)) {
  processDirectory(PROJECT_ROOT);
} else {
  console.error(`Directory not found: ${PROJECT_ROOT}`);
}
