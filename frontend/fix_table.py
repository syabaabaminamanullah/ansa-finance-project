import re

with open(r'src\modules\finance\pages\JournalPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">\s*<tr>\s*<th className="px-4 py-3.5 w-\[30%\]">Account \(COA\)</th>\s*<th className="px-4 py-3.5 w-\[35%\]">Line Description</th>\s*<th className="px-4 py-3.5 w-\[15%\]">Debit \(Rp\)</th>\s*<th className="px-4 py-3.5 w-\[15%\]">Credit \(Rp\)</th>\s*<th className="px-4 py-3.5 w-12 text-center">Act</th>\s*</tr>\s*</thead>',
    re.DOTALL
)

replacement = """<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3.5 w-[35%]">Account (COA)</th>
                    <th className="px-4 py-3.5">Line Description</th>
                    <th className="px-4 py-3.5 w-[15%]">Debit (Rp)</th>
                    <th className="px-4 py-3.5 w-[15%]">Credit (Rp)</th>
                    <th className="px-4 py-3.5 w-14 text-center">Act</th>
                  </tr>
                </thead>"""

new_content = pattern.sub(replacement, content)

if content != new_content:
    with open(r'src\modules\finance\pages\JournalPage.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("NO MATCH FOUND")
