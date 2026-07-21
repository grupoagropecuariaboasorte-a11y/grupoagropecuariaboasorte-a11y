function packNotes(notes, price, edit) {
  let cleanNotes = (notes || '').replace(/\n?\[META:[^\]]+\]/g, '').replace(/\n?\[Justificativa da alteração:[^\]]+\]/g, '').trim();
  if (price !== undefined) cleanNotes += `\n[META:price=${price}]`;
  if (edit) cleanNotes += `\n[META:edit=${edit}]`;
  return cleanNotes.trim();
}

function unpackFuelStock(stock) {
  if (!stock) return stock;
  let notes = stock.notes || '';
  
  const priceMatch = notes.match(/\[META:price=([^\]]+)\]/);
  if (priceMatch) stock.price_per_liter = Number(priceMatch[1]);
  
  const editMatch = notes.match(/\[META:edit=([^\]]+)\]/);
  if (editMatch) {
    stock.edit_justification = editMatch[1];
  } else {
    const oldEditMatch = notes.match(/\[Justificativa da alteração:\s*(.*?)\]/);
    if (oldEditMatch) stock.edit_justification = oldEditMatch[1];
  }

  stock.notes = notes.replace(/\n?\[META:[^\]]+\]/g, '').replace(/\n?\[Justificativa da alteração:[^\]]+\]/g, '').trim();
  return stock;
}

let n1 = packNotes('Teste inicial', 5.50, undefined);
console.log('n1:', n1);
let u1 = unpackFuelStock({ notes: n1 });
console.log('u1:', u1);

let n2 = packNotes(u1.notes, 6.20, 'Preço incorreto');
console.log('n2:', n2);
let u2 = unpackFuelStock({ notes: n2 });
console.log('u2:', u2);
