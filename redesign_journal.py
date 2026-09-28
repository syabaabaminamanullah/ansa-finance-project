import os
import re

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update formData state
content = content.replace(
"""  const [formData, setFormData] = useState<{
    journal_number: string;
    date: string;
    description: string;
    attachment_path?: string;
  attachment_path_2?: string;
    lines: JournalLine[];
  }>({""",
"""  const [formData, setFormData] = useState<{
    journal_number: string;
    date: string;
    description: string;
    project_id?: string;
    project_rab_id?: string;
    attachment_path?: string;
    attachment_path_2?: string;
    lines: JournalLine[];
  }>({"""
)

content = content.replace(
"""  }>({
    journal_number: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    attachment_path: '',
    attachment_path_2: '',
    lines: [""",
"""  }>({
    journal_number: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    project_id: '',
    project_rab_id: '',
    attachment_path: '',
    attachment_path_2: '',
    lines: ["""
)

# 2. Update handleEditClick
content = content.replace(
"""    setFormData({
      journal_number: row.journal_number,
      date: row.date,
      description: row.description || '',
      lines: row.lines && row.lines.length > 0 ? row.lines : [
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
    row.lines?.forEach(line => {
      if (line.project_id) fetchRabItems(line.project_id);
    });""",
"""    const firstLineProj = row.lines?.[0]?.project_id || '';
    const firstLineRab = row.lines?.[0]?.project_rab_id || '';
    setFormData({
      journal_number: row.journal_number,
      date: row.date,
      description: row.description || '',
      project_id: firstLineProj,
      project_rab_id: firstLineRab,
      lines: row.lines && row.lines.length > 0 ? row.lines : [
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
    if (firstLineProj) fetchRabItems(firstLineProj);"""
)

# 3. Update handleSave
content = content.replace(
"""        const payload = {
          ...formData,
          description: formData.description || undefined,
          lines: formData.lines.map(line => ({
            ...line,
            project_id: line.project_id === '' ? undefined : line.project_id,
            project_rab_id: line.project_rab_id === '' ? undefined : line.project_rab_id,
          }))
        };""",
"""        const payload = {
          ...formData,
          description: formData.description || undefined,
          lines: formData.lines.map(line => ({
            ...line,
            project_id: formData.project_id || undefined,
            project_rab_id: formData.project_rab_id || undefined,
          }))
        };"""
)

# 4. Form Headers
header_str = """            <div className="grid grid-cols-12 gap-4 pb-2">
              <div className="col-span-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-textPrimary">Journal No.</label>
                  <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium border border-warning/20">Otomatis</span>
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
              <div className="col-span-3 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Date</label>
                <DatePicker
                  required
                  value={formData.date}
                  onChange={(val) => handleJournalDateChange(val)}
                />
              </div>
              <div className="col-span-6 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description..."/>
              </div>
            </div>"""

new_header_str = """            <div className="grid grid-cols-12 gap-4 pb-2">
              <div className="col-span-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-textPrimary">Journal No.</label>
                  <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium border border-warning/20">Otomatis</span>
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
              <div className="col-span-3 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Date</label>
                <DatePicker
                  required
                  value={formData.date}
                  onChange={(val) => handleJournalDateChange(val)}
                />
              </div>
              <div className="col-span-6 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description..."/>
              </div>
            </div>
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
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary disabled:bg-muted/50"
                >
                  <option value="">-- No RAB --</option>
                  {formData.project_id && rabItemsByProject[formData.project_id]?.map(r => (
                    <option key={r.id} value={r.id}>{r.item_name} (Sisa: {formatCurrency(r.remaining_budget)})</option>
                  ))}
                </select>
              </div>
            </div>"""

content = content.replace(header_str, new_header_str)

# 5. Form Table headers
content = content.replace(
"""                <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3.5 w-[30%]">Account (COA)</th>
                    <th className="px-4 py-3.5 w-[15%]">Project</th>
                    <th className="px-4 py-3.5 w-[15%]">RAB / Anggaran</th>
                    <th className="px-4 py-3.5">Line Description</th>
                    <th className="px-4 py-3.5 w-40">Debit (Rp)</th>
                    <th className="px-4 py-3.5 w-40">Credit (Rp)</th>
                    <th className="px-4 py-3.5 w-12 text-center">Act</th>
                  </tr>
                </thead>""",
"""                <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3.5 w-[40%]">Account (COA)</th>
                    <th className="px-4 py-3.5">Line Description</th>
                    <th className="px-4 py-3.5 w-48">Debit (Rp)</th>
                    <th className="px-4 py-3.5 w-48">Credit (Rp)</th>
                    <th className="px-4 py-3.5 w-12 text-center">Act</th>
                  </tr>
                </thead>"""
)

# 6. Form Table body
body_str = """                      <td className="px-3 py-2 min-w-[320px]">
                        <CoaSelect
                          required
                          placement="top"
                          align="left"
                          popupWidth="w-[460px] sm:w-[520px]"
                          accounts={coas}
                          value={line.account_id}
                          onChange={(val) => updateLine(idx, 'account_id', val)}
                          placeholder="-- Pilih Akun COA --"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select 
                          value={line.project_id || ''}
                          onChange={(e) => updateLine(idx, 'project_id', e.target.value)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary"
                        >
                          <option value="">-- No Project --</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.code}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select 
                          value={line.project_rab_id || ''}
                          onChange={(e) => updateLine(idx, 'project_rab_id', e.target.value)}
                          disabled={!line.project_id}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary disabled:bg-muted/50"
                        >
                          <option value="">-- No RAB --</option>
                          {line.project_id && rabItemsByProject[line.project_id]?.map(r => (
                            <option key={r.id} value={r.id}>{r.item_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">"""

new_body_str = """                      <td className="px-3 py-2 min-w-[320px]">
                        <CoaSelect
                          required
                          placement="top"
                          align="left"
                          popupWidth="w-[460px] sm:w-[520px]"
                          accounts={coas}
                          value={line.account_id}
                          onChange={(val) => updateLine(idx, 'account_id', val)}
                          placeholder="-- Pilih Akun COA --"
                        />
                      </td>
                      <td className="px-2 py-2">"""

content = content.replace(body_str, new_body_str)

# Update `updateLine` to NOT fetch RAB items anymore because project is not in line anymore
content = content.replace(
"""    const updateLine = (index: number, field: keyof JournalLine, value: any) => {
      const newLines = [...formData.lines];
      if (field === 'debit') {
        newLines[index].debit = value === '' ? 0 : Number(value);
        if (Number(value) > 0) newLines[index].credit = 0;
      } else if (field === 'credit') {
        newLines[index].credit = value === '' ? 0 : Number(value);
        if (Number(value) > 0) newLines[index].debit = 0;
      } else {
        newLines[index] = { ...newLines[index], [field]: value };
      }
      
      // If project changed, fetch RAB and reset RAB selection
      if (field === 'project_id') {
        newLines[index].project_rab_id = undefined;
        if (value) {
          fetchRabItems(value);
        }
      }
      
      setFormData({ ...formData, lines: newLines });
    };""",
"""    const updateLine = (index: number, field: keyof JournalLine, value: any) => {
      const newLines = [...formData.lines];
      if (field === 'debit') {
        newLines[index].debit = value === '' ? 0 : Number(value);
        if (Number(value) > 0) newLines[index].credit = 0;
      } else if (field === 'credit') {
        newLines[index].credit = value === '' ? 0 : Number(value);
        if (Number(value) > 0) newLines[index].debit = 0;
      } else {
        newLines[index] = { ...newLines[index], [field]: value };
      }
      setFormData({ ...formData, lines: newLines });
    };"""
)

# 7. Form Table Footer
content = content.replace(
"""                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-textPrimary">Total:</td>
                      <td className={`px-4 py-3 font-bold ${!isBalanced && isDirty ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalDebit)}</td>
                      <td className={`px-4 py-3 font-bold ${!isBalanced && isDirty ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalCredit)}</td>
                      <td></td>
                    </tr>""",
"""                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-textPrimary">Total:</td>
                      <td className={`px-4 py-3 font-bold ${!isBalanced && isDirty ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalDebit)}</td>
                      <td className={`px-4 py-3 font-bold ${!isBalanced && isDirty ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalCredit)}</td>
                      <td></td>
                    </tr>"""
)

# 8. View Modal Headers
view_header_str = """              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-textSecondary">Journal No.</p>
                  <p className="font-bold font-mono text-primary">{editingItem.journal_number}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary">Date</p>
                  <p className="font-medium text-textPrimary">{editingItem.date}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary">Status</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                    editingItem.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {editingItem.status}
                  </span>
                </div>
              </div>"""

new_view_header_str = """              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-textSecondary">Journal No.</p>
                  <p className="font-bold font-mono text-primary">{editingItem.journal_number}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary">Date</p>
                  <p className="font-medium text-textPrimary">{editingItem.date}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary">Status</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                    editingItem.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {editingItem.status}
                  </span>
                </div>
              </div>
              
              {(editingItem.lines?.[0]?.project_id) && (
                <div className="grid grid-cols-2 gap-4 pb-2">
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

content = content.replace(view_header_str, new_view_header_str)

# 9. View Modal Table
view_table_head_str = """                  <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Account (COA)</th>
                      <th className="px-4 py-3">Project / RAB</th>
                      <th className="px-4 py-3">Line Description</th>
                      <th className="px-4 py-3 text-right">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right">Credit (Rp)</th>
                    </tr>
                  </thead>"""

new_view_table_head_str = """                  <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                    <tr>
                      <th className="px-4 py-3 w-[40%]">Account (COA)</th>
                      <th className="px-4 py-3">Line Description</th>
                      <th className="px-4 py-3 text-right w-32">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right w-32">Credit (Rp)</th>
                    </tr>
                  </thead>"""

content = content.replace(view_table_head_str, new_view_table_head_str)

view_table_body_str = """                        <td className="px-4 py-3 text-textSecondary">
                          <div className="font-medium text-textPrimary">{line.project_id ? projects.find(p => p.id === line.project_id)?.code : '-'}</div>
                          {line.project_rab_id && <div className="text-xs text-primary font-medium mt-0.5">Ber-Alokasi RAB</div>}
                        </td>
                        <td className="px-4 py-3 text-textSecondary">{line.description || '-'}</td>"""

new_view_table_body_str = """                        <td className="px-4 py-3 text-textSecondary">{line.description || '-'}</td>"""

content = content.replace(view_table_body_str, new_view_table_body_str)

view_table_footer_str = """                  <tfoot className="bg-background font-bold text-textPrimary">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">Total:</td>"""

new_view_table_footer_str = """                  <tfoot className="bg-background font-bold text-textPrimary">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">Total:</td>"""

content = content.replace(view_table_footer_str, new_view_table_footer_str)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated JournalPage successfully")
