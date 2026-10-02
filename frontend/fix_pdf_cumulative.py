with open(r'src\modules\finance\utils\pdfGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    // Matrix Net Cashflow
    const netRow = ['-', 'NET CASH FLOW'];
    data.weeks.forEach((w: any) => {
      netRow.push(w.net !== 0 ? formatMatrixVal(w.net) : '-');
    });'''

replacement = '''    // Matrix Net Cashflow
    const netRow = ['-', 'NET CASH FLOW'];
    data.weeks.forEach((w: any) => {
      netRow.push(w.cumulative !== 0 ? formatMatrixVal(w.cumulative) : '-');
    });'''

if target in content:
    content = content.replace(target, replacement)
    with open(r'src\modules\finance\utils\pdfGenerator.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED")
