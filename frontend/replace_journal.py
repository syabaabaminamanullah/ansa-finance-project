import re

with open(r'src\modules\finance\pages\JournalPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'<div className="grid grid-cols-12 gap-6">.*?<div className="grid grid-cols-2 gap-4 pb-4">.*?</select>\s*</div>\s*</div>', 
    re.DOTALL
)

replacement = """<div className="grid grid-cols-12 gap-6 pb-4">
            <div className="col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-textPrimary">Journal No.</label>
                  <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    Otomatis
                  </span>
                </div>
                <input 
                  required 
                  readOnly 
                  type="text" 
                  value={formData.journal_number} 
                  title="Nomor Jurnal dihitung otomatis berurutan oleh sistem buku besar"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-primary font-mono font-bold cursor-not-allowed select-none shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Date</label>
                <DatePicker
                  required
                  value={formData.date}
                  onChange={(val) => handleJournalDateChange(val)}
                />
              </div>
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
                    <option key={r.id} value={r.id}>{r.category} - {r.description}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-span-6 space-y-1.5 flex flex-col">
              <label className="text-sm font-medium text-textPrimary">Description</label>
              <textarea 
                required
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full flex-grow px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary resize-none min-h-[110px]" 
                placeholder="Brief description..."
              />
            </div>
          </div>"""

new_content = pattern.sub(replacement, content, count=1)

if content != new_content:
    with open(r'src\modules\finance\pages\JournalPage.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH REGEX")
