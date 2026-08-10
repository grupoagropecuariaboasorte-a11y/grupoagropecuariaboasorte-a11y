const fs = require('fs');
let code = fs.readFileSync('src/pages/DieselStock.tsx', 'utf8');

code = code.replace(
  /setIsEditOpen\(false\);/,
  "setIsEditOpen(false);\n      setEditingId(null);"
);

code = code.replace(
  /setIsDeleteOpen\(false\);/,
  "setIsDeleteOpen(false);\n      setDeletingId(null);"
);

fs.writeFileSync('src/pages/DieselStock.tsx', code);
