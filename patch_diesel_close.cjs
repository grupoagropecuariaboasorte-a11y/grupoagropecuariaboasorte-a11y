const fs = require('fs');
let code = fs.readFileSync('src/pages/DieselStock.tsx', 'utf8');

code = code.replace(
  /<Modal isOpen=\{isEditOpen\} onClose=\{\(\) => setIsEditOpen\(false\)\} title="Editar Entrada de Diesel \(Tanque\)">/,
  `<Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingId(null); }} title="Editar Entrada de Diesel (Tanque)">`
);

fs.writeFileSync('src/pages/DieselStock.tsx', code);
