import os
import re

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(<div className="col-span-6 space-y-1\.5">\s*<label className="text-sm font-medium text-textPrimary">Description</label>\s*<input type="text" value=\{formData\.description\} onChange=\{e => setFormData\(\{\.\.\.formData, description: e\.target\.value\}\)\} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description\.\.\."/>\s*</div>\s*</div>)'

replacement = r"""\1

            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Project (Opsional)</label>
                <select 
                  value={formData.project_id || ''}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setFormData({...formData, project_id: pid, project_rab_id: ''});
                    if (pid) fetchRabItems(pid);
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"
                >
                  <option value="">-- No Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">RAB / Anggaran (Opsional)</label>
                <select 
                  value={formData.project_rab_id || ''}
                  onChange={(e) => setFormData({...formData, project_rab_id: e.target.value})}
                  disabled={!formData.project_id}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary disabled:opacity-50"
                >
                  <option value="">-- No RAB --</option>
                  {formData.project_id && rabItemsByProject[formData.project_id]?.map(r => (
                    <option key={r.id} value={r.id}>{r.category} → {r.description}</option>
                  ))}
                </select>
              </div>
            </div>"""

if "Project (Opsional)" not in content:
    content = re.sub(pattern, replacement, content, count=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Project dropdowns successfully inserted.")
else:
    print("Already inserted.")
