import os
import re

def fix_journal_page():
    path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the problematic block. In JournalPage, the block before "Dokumen Pendukung" is the table of Journal Lines.
    # We can just look for the first </div></div></div></div> that is wrong, or we can use the same regex if we know the string before Dokumen Pendukung.
    
    # In JournalPage:
    # </div>
    # </div>
    # <div className="mt-6 border-t border-border pt-6">
    # <h4 ... Dokumen Pendukung
    
    # Let's just fix it by replacing the extra </div> before <div className="mt-6 border-t border-border pt-6">
    # Wait, how many extra divs? Let's just replace all occurrences of:
    # </div>\n            </div>\n            <div className="mt-6 border-t border-border pt-6">
    # with:
    # </div>\n            <div className="mt-6 border-t border-border pt-6">
    # And then add the missing </div> right before {previewPdf && (
    
    # Actually, let's just do a simpler search and replace for JournalPage.
    
    # Remove one </div> before Dokumen Pendukung
    pattern_before = r'(</div>\s*</div>\s*)<div className="mt-6 border-t border-border pt-6">'
    if re.search(pattern_before, content):
        content = re.sub(pattern_before, r'</div>\n              <div className="mt-6 border-t border-border pt-6">', content, count=1)
        
    # Add one </div> before {previewPdf && (
    pattern_after = r'(<Upload className="w-3 h-3" /> Upload Susulan\s*</label>\s*)}\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*{previewPdf &&'
    if re.search(pattern_after, content):
        content = re.sub(pattern_after, r'\1\n                      )}\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </div>\n              {previewPdf &&', content, count=1)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed JournalPage layout.")

fix_journal_page()
