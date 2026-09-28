import os
import re

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 5. Form Table headers
table_head_pattern = r'<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">\s*<tr>\s*<th className="px-4 py-3\.5 w-\[30\%\]">Account \(COA\)</th>\s*<th className="px-4 py-3\.5 w-\[15\%\]">Project</th>\s*<th className="px-4 py-3\.5 w-\[15\%\]">RAB / Anggaran</th>\s*<th className="px-4 py-3\.5">Line Description</th>\s*<th className="px-4 py-3\.5 w-40">Debit \(Rp\)</th>\s*<th className="px-4 py-3\.5 w-40">Credit \(Rp\)</th>\s*<th className="px-4 py-3\.5 w-12 text-center">Act</th>\s*</tr>\s*</thead>'

new_table_head = """<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3.5 w-[40%]">Account (COA)</th>
                    <th className="px-4 py-3.5">Line Description</th>
                    <th className="px-4 py-3.5 w-48">Debit (Rp)</th>
                    <th className="px-4 py-3.5 w-48">Credit (Rp)</th>
                    <th className="px-4 py-3.5 w-12 text-center">Act</th>
                  </tr>
                </thead>"""

content = re.sub(table_head_pattern, new_table_head, content, count=1)

# 6. Form Table body (remove Project and RAB TDs)
# We can find the td with Project select and remove it.
# The project td starts after the CoaSelect td.
td_pattern = r'(<td className="px-3 py-2 min-w-\[320px\]">.*?</td>)\s*<td className="px-2 py-2">\s*<select\s+value=\{line\.project_id \|\| \'\'\}\s+onChange=\{\(e\) => updateLine\(idx, \'project_id\', e\.target\.value\)\}\s+className="w-full px-2 py-1\.5 bg-background border border-border rounded text-sm text-textPrimary"\s*>\s*<option value="">-- No Project --</option>\s*\{projects\.map\(p => \(\s*<option key=\{p\.id\} value=\{p\.id\}>\{p\.code\} - \{p\.name\}</option>\s*\)\)\}\s*</select>\s*</td>\s*<td className="px-2 py-2">\s*<select\s+value=\{line\.project_rab_id \|\| \'\'\}\s+onChange=\{\(e\) => updateLine\(idx, \'project_rab_id\', e\.target\.value\)\}\s+disabled=\{!line\.project_id\}\s+className="w-full px-2 py-1\.5 bg-background border border-border rounded text-sm text-textPrimary disabled:opacity-50"\s*>\s*<option value="">-- No RAB --</option>\s*\{line\.project_id && rabItemsByProject\[line\.project_id\]\?\.map\(r => \(\s*<option key=\{r\.id\} value=\{r\.id\}>\{r\.category\} .*? \{r\.description\}</option>\s*\)\)\}\s*</select>\s*</td>'

content = re.sub(td_pattern, r'\1', content, flags=re.DOTALL)


# 8. View Modal Headers
view_header_pattern = r'(<div className="grid grid-cols-3 gap-4 pb-4 border-b border-border">\s*<div>\s*<p className="text-sm text-textSecondary">Journal No.</p>\s*<p className="font-bold font-mono text-primary">\{editingItem.journal_number\}</p>\s*</div>\s*<div>\s*<p className="text-sm text-textSecondary">Date</p>\s*<p className="font-medium text-textPrimary">\{editingItem.date\}</p>\s*</div>\s*<div>\s*<p className="text-sm text-textSecondary">Status</p>\s*<span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mt-1 \$\{\s*editingItem.status === \'Posted\' \? \'bg-success/10 text-success\' : \'bg-warning/10 text-warning\'\s*\}`}>.*?</span>\s*</div>\s*</div>)'

new_view_header = r"""\1
              
              {(editingItem.lines?.[0]?.project_id) && (
                <div className="grid grid-cols-2 gap-4 pb-2 pt-4">
                  <div>
                    <p className="text-sm text-textSecondary">Project</p>
                    <p className="font-medium text-textPrimary">{projects.find(p => p.id === editingItem.lines?.[0]?.project_id)?.name || '-'}</p>
                  </div>
                  {editingItem.lines?.[0]?.project_rab_id && (
                    <div>
                      <p className="text-sm text-textSecondary">RAB / Anggaran</p>
                      <p className="font-medium text-textPrimary">Ter-Alokasi RAB</p>
                    </div>
                  )}
                </div>
              )}"""

if "Ter-Alokasi RAB" not in content:
    content = re.sub(view_header_pattern, new_view_header, content, count=1, flags=re.DOTALL)


# 9. View Modal Table Head
view_table_head_pattern = r'<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">\s*<tr>\s*<th className="px-4 py-3">Account \(COA\)</th>\s*<th className="px-4 py-3">Project / RAB</th>\s*<th className="px-4 py-3">Line Description</th>\s*<th className="px-4 py-3 text-right">Debit \(Rp\)</th>\s*<th className="px-4 py-3 text-right">Credit \(Rp\)</th>\s*</tr>\s*</thead>'

new_view_table_head = """<thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                    <tr>
                      <th className="px-4 py-3 w-[40%]">Account (COA)</th>
                      <th className="px-4 py-3">Line Description</th>
                      <th className="px-4 py-3 text-right w-32">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right w-32">Credit (Rp)</th>
                    </tr>
                  </thead>"""

content = re.sub(view_table_head_pattern, new_view_table_head, content, count=1)


# 10. View Modal Table Body
view_table_body_pattern = r'(<td className="px-4 py-3 font-medium text-textPrimary">\{getAccountDisplay\(line.account_id\)\}</td>)\s*<td className="px-4 py-3 text-textSecondary">\s*<div className="font-medium text-textPrimary">\{line.project_id \? projects.find\(p => p.id === line.project_id\)\?.code : \'-\'\}</div>\s*\{line.project_rab_id && <div className="text-xs text-primary font-medium mt-0\.5">Ber-Alokasi RAB</div>\}\s*</td>'

content = re.sub(view_table_body_pattern, r'\1', content, count=1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("regex redesign applied.")
