import os
import re

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Form Table Header
form_th_pattern = r'<tr>\s*<th className="px-4 py-3\.5 w-\[40\%\]">Account \(COA\)</th>\s*<th className="px-4 py-3\.5">Line Description</th>\s*<th className="px-4 py-3\.5 w-48">Debit \(Rp\)</th>\s*<th className="px-4 py-3\.5 w-48">Credit \(Rp\)</th>\s*<th className="px-4 py-3\.5 w-12 text-center">Act</th>\s*</tr>'
form_th_replacement = r"""<tr>
                      <th className="px-4 py-3.5 w-[30%]">Account (COA)</th>
                      <th className="px-4 py-3.5 w-[35%]">Line Description</th>
                      <th className="px-4 py-3.5 w-[15%]">Debit (Rp)</th>
                      <th className="px-4 py-3.5 w-[15%]">Credit (Rp)</th>
                      <th className="px-4 py-3.5 w-12 text-center">Act</th>
                    </tr>"""
content = re.sub(form_th_pattern, form_th_replacement, content)


# 2. Update Form Table min-w for Account COA
content = content.replace('className="px-3 py-2 min-w-[320px]"', 'className="px-3 py-2 min-w-[280px]"')


# 3. Update View Details Table Header
view_th_pattern = r'<tr>\s*<th className="px-4 py-3 w-\[40\%\]">Account \(COA\)</th>\s*<th className="px-4 py-3">Line Description</th>\s*<th className="px-4 py-3 text-right w-32">Debit \(Rp\)</th>\s*<th className="px-4 py-3 text-right w-32">Credit \(Rp\)</th>\s*</tr>'
view_th_replacement = r"""<tr>
                        <th className="px-4 py-3 w-[30%]">Account (COA)</th>
                        <th className="px-4 py-3 w-[40%]">Line Description</th>
                        <th className="px-4 py-3 text-right w-[15%]">Debit (Rp)</th>
                        <th className="px-4 py-3 text-right w-[15%]">Credit (Rp)</th>
                      </tr>"""
content = re.sub(view_th_pattern, view_th_replacement, content)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Table widths adjusted successfully.")
