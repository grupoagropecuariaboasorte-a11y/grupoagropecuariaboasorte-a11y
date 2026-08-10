const fs = require('fs');

let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

// 1. Fix safeUpdate regex
code = code.replace(
  /const match = error\.message\.match\(\/'\(\.\*\?\)' column\/\);/g,
  `let colName = '';
      const match1 = error.message?.match(/'(.*?)' column/);
      const match2 = error.message?.match(/column [^.]+\\.(.*?) does not exist/);
      if (match1 && match1[1]) colName = match1[1];
      else if (match2 && match2[1]) colName = match2[1];`
);
code = code.replace(
  /if \(match && match\[1\]\) \{[\s\S]*?console\.warn\(\`\[SafeUpdate\] Stripping missing column \$\{match\[1\]\} from \$\{table\}\`\);[\s\S]*?delete currentPayload\[match\[1\]\];/g,
  `if (colName) {
        console.warn(\`[SafeUpdate] Stripping missing column \${colName} from \${table}\`);
        delete currentPayload[colName];`
);

// 2. Fix safeInsert regex
code = code.replace(
  /const match = error\.message\.match\(\/'\(\.\*\?\)' column\/\);/g,
  `let colName = '';
      const match1 = error.message?.match(/'(.*?)' column/);
      const match2 = error.message?.match(/column [^.]+\\.(.*?) does not exist/);
      if (match1 && match1[1]) colName = match1[1];
      else if (match2 && match2[1]) colName = match2[1];`
);
code = code.replace(
  /if \(match && match\[1\]\) \{[\s\S]*?console\.warn\(\`\[SafeInsert\] Stripping missing column \$\{match\[1\]\} from \$\{table\}\`\);[\s\S]*?delete currentPayload\[match\[1\]\];/g,
  `if (colName) {
        console.warn(\`[SafeInsert] Stripping missing column \${colName} from \${table}\`);
        delete currentPayload[colName];`
);

fs.writeFileSync('src/lib/fleetService.ts', code);
