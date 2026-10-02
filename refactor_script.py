import re
import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Hide Payment status on create
    content = content.replace(
        '<div className="space-y-1.5">\n              <label className="text-sm font-medium text-textPrimary">Payment Status</label>',
        '{editingItem && (\n              <div className="space-y-1.5">\n              <label className="text-sm font-medium text-textPrimary">Payment Status</label>'
    )
    
    content = content.replace(
        '<option value="Paid">Paid</option>\n              </select>\n            </div>',
        '<option value="Paid">Paid</option>\n              </select>\n            </div>\n            )}'
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Done refactoring ArInvoicePage.tsx")

if __name__ == "__main__":
    main()
