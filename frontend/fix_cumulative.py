import re

with open(r'src\modules\finance\components\WeeklyProjectCashflowView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Just replace `w.net` with `w.cumulative` inside the NET CASH FLOW loop.
# Let's find the specific block.

target = r'<td colSpan=\{2\} className="py-2.5 px-3 text-right uppercase text-primary">NET CASH FLOW</td>\s*\{activeData.weeks.map\(\(w: any\) => \(\s*<td key=\{w.week_num\} className=\{\`py-2.5 px-2 text-right font-mono \$\{w.net >= 0 \? \'text-success \\n?font-semibold\' : \'text-danger\'\}\`\}>\s*\{w.net !== 0 \? formatCurrency\(w.net\) : \'-\'\}\s*</td>\s*\)\)\}'

target = r'<td colSpan=\{2\} className="py-2\.5 px-3 text-right uppercase text-primary">NET CASH FLOW</td>\s*\{activeData\.weeks\.map\(\(w: any\) => \(\s*<td key=\{w\.week_num\} className=\{\`py-2\.5 px-2 text-right font-mono \$\{w\.net >= 0 \? \'text-success \s*font-semibold\' : \'text-danger\'\}\`\}>\s*\{w\.net !== 0 \? formatCurrency\(w\.net\) : \'-\'\}\s*</td>\s*\)\)\}'

# To avoid regex issues, let's just do a string replace on a smaller snippet.
snippet1 = "w.net >= 0 ? 'text-success font-semibold' : 'text-danger'"
snippet2 = "w.net !== 0 ? formatCurrency(w.net) : '-'"

# Wait, `w.net` is also used elsewhere?
# Oh, there's another w.net check:
# <td key={w.week_num} className={`py-2.5 px-2 text-right font-mono ${w.net >= 0 ? 'text-success font-semibold' : 'text-danger'}`}>
# We can just change that specific td.

pattern = re.compile(r'<td colSpan=\{2\} className="py-2\.5 px-3 text-right uppercase text-primary">NET CASH FLOW</td>\s*\{activeData\.weeks\.map\(\(w: any\) => \(\s*<td key=\{w\.week_num\} className=\{\`py-2\.5 px-2 text-right font-mono \$\{w\.net >= 0 \? \'text-success[^`]*font-semibold\' : \'text-danger\'\}\`\}>\s*\{w\.net !== 0 \? formatCurrency\(w\.net\) : \'-\'\}\s*</td>\s*\)\)\}', re.DOTALL)

replacement = '''<td colSpan={2} className="py-2.5 px-3 text-right uppercase text-primary">NET CASH FLOW</td>
                  {activeData.weeks.map((w: any) => (
                    <td key={w.week_num} className={`py-2.5 px-2 text-right font-mono ${w.cumulative >= 0 ? 'text-success font-semibold' : 'text-danger'}`}>
                      {w.cumulative !== 0 ? formatCurrency(w.cumulative) : '-'}
                    </td>
                  ))}'''

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open(r'src\modules\finance\components\WeeklyProjectCashflowView.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED")
