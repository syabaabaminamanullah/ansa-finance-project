import os
import re

def fix_expense_page():
    path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'ExpensePage.tsx')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the problematic block
    pattern = r'(Total Deducted.*?</div>\s*</div>)\s*</div>\s*<div className="mt-6 border-t border-border pt-6">'
    
    if re.search(pattern, content, re.DOTALL):
        # We need to remove the extra </div>
        replacement = r'\1\n              <div className="mt-6 border-t border-border pt-6">'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        print("Removed extra div.")
        
        # Now find where to add it back.
        # It needs to be added after the end of the Dokumen Pendukung block, before {previewPdf &&
        
        pattern_end = r'(<Upload className="w-3 h-3" /> Upload Susulan\s*</label>\s*)}\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*{previewPdf &&'
        replacement_end = r'\1\n                      )}\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </div>\n              {previewPdf &&'
        content = re.sub(pattern_end, replacement_end, content, flags=re.DOTALL)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed ExpensePage layout.")
    else:
        print("Could not find pattern in ExpensePage.")

def fix_journal_page():
    path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # JournalPage has a similar structure. Let's check it.
    # Actually, I'll just look at the file manually if needed, but I think it has the exact same bug because I used a similar replacement script.
    # Wait, in JournalPage, I didn't inject "Dokumen Pendukung" with a python script recently, that was there already.
    # Let me just check JournalPage directly.
    pass

fix_expense_page()
