import re

with open(r'src\modules\finance\pages\JournalPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<tfoot className="bg-background font-semibold">\s*<tr>\s*<td colSpan=\{4\} className="px-4 py-3 text-right">Total:</td>\s*<td className=\{`px-4 py-3 text-right \$\{totalDebit !== totalCredit \? \'text-danger\' : \'text-success\'\}`\}>\{formatCurrency\(totalDebit\)\}</td>\s*<td className=\{`px-4 py-3 text-right \$\{totalDebit !== totalCredit \? \'text-danger\' : \'text-success\'\}`\}>\{formatCurrency\(totalCredit\)\}</td>\s*<td></td>\s*</tr>\s*</tfoot>', re.DOTALL)

replacement = """<tfoot className="bg-background font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right">Total:</td>
                    <td className={`px-4 py-3 text-right ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalDebit)}</td>
                    <td className={`px-4 py-3 text-right ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>"""

new_content = pattern.sub(replacement, content)

if content != new_content:
    with open(r'src\modules\finance\pages\JournalPage.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("NO MATCH")
