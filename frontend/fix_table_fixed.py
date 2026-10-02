with open(r'src\modules\finance\pages\JournalPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '<table className="w-full text-sm text-left">'
replacement = '<table className="w-full text-sm text-left table-fixed">'

new_content = content.replace(target, replacement)

with open(r'src\modules\finance\pages\JournalPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Replaced {content.count(target)} occurrences.')
