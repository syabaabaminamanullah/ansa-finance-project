import re

with open(r'src\modules\finance\pages\JournalPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<td colSpan=\{3\} className="px-4 py-3 text-right">Total:</td>\s*<td className="px-4 py-3 text-right">\{formatCurrency\(editingItem\.lines\?\.reduce\(\(sum, l\) => sum \+ l\.debit, 0\) \|\| 0\)\}</td>\s*<td className="px-4 py-3 text-right">\{formatCurrency\(editingItem\.lines\?\.reduce\(\(sum, l\) => sum \+ l\.credit, 0\) \|\| 0\)\}</td>', re.DOTALL)

replacement = """<td colSpan={2} className="px-4 py-3 text-right">Total:</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(editingItem.lines?.reduce((sum, l) => sum + l.debit, 0) || 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(editingItem.lines?.reduce((sum, l) => sum + l.credit, 0) || 0)}</td>"""

new_content = pattern.sub(replacement, content)

if content != new_content:
    with open(r'src\modules\finance\pages\JournalPage.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("NO MATCH FOR SECOND FOOTER")
