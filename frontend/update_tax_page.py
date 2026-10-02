with open('frontend/src/modules/finance/pages/TaxCalculatorPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Import
content = content.replace("import { formatCurrency } from '../../../utils/formatters';", "import { formatCurrency } from '../../../utils/formatters';\nimport { TaxWorkerManager } from '../components/TaxWorkerManager';")

# Update activeTab type
content = content.replace("useState<'pph21' | 'ppn23' | 'pph42'>('pph21')", "useState<'pph21' | 'ppn23' | 'pph42' | 'hr'>('pph21')")

# Add Tab Button
btn_target = '''        <div className="flex space-x-1 bg-background/50 p-1 rounded-lg border border-border w-fit">'''
btn_replacement = '''        <div className="flex space-x-1 bg-background/50 p-1 rounded-lg border border-border w-fit">
          <button
            onClick={() => setActiveTab('hr')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'hr' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:bg-background'
            }`}
          >
            Pengelola Pekerja (HR)
          </button>'''
content = content.replace(btn_target, btn_replacement)

# Add HR View at the end of the tabs
view_target = '''        </div>
      </div>
    </div>
  );
}'''
view_replacement = '''          {/* TAB HR / PENGELOLA PEKERJA */}
          {activeTab === 'hr' && (
            <TaxWorkerManager />
          )}
        </div>
      </div>
    </div>
  );
}'''
content = content.replace(view_target, view_replacement)

with open('frontend/src/modules/finance/pages/TaxCalculatorPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
