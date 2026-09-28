import os

def patch_journal_form_layout():
    path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to find the specific block
    old_block = """          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-textPrimary">Journal No.</label>"""
                  
    new_block = """          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-textPrimary">Journal No.</label>"""
                  
    if old_block in content:
        content = content.replace(old_block, new_block)
        
        # Now fix the Date and Description wrappers. Since we don't want to replace all of them,
        # we will use string.replace carefully.
        
        old_date = """              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Date</label>
                <DatePicker"""
        new_date = """              <div className="col-span-3 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Date</label>
                <DatePicker"""
        content = content.replace(old_date, new_date)
        
        old_desc = """              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Description</label>
                <input type="text" value={formData.description}"""
        new_desc = """              <div className="col-span-6 space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Description</label>
                <input type="text" value={formData.description}"""
        content = content.replace(old_desc, new_desc)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Journal form layout patched.")
    else:
        print("Could not find the target block.")

patch_journal_form_layout()
