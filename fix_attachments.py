import os

def patch_backend():
    finance_path = os.path.join('backend', 'api', 'routes', 'finance.py')
    with open(finance_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Replace upload_file
    old_upload = """@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    try:
        os.makedirs("uploads", exist_ok=True)
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join("uploads", filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"url": f"/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))"""

    new_upload = """@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    import os, shutil, requests, mimetypes
    try:
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Local fallback
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "journal_attachments")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file.file.seek(0)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Supabase upload
        supabase_url = os.getenv("SUPABASE_URL", "https://rwglshhjtgwjudwdgkvf.supabase.co")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", ""))
        supabase_bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "attachments")
        
        if supabase_url and supabase_key:
            try:
                file.file.seek(0)
                file_bytes = file.file.read()
                mime_type, _ = mimetypes.guess_type(filename)
                headers = {
                    "Authorization": f"Bearer {supabase_key}",
                    "apikey": supabase_key,
                    "Content-Type": mime_type or "application/octet-stream",
                    "x-upsert": "true"
                }
                storage_url = f"{supabase_url}/storage/v1/object/{supabase_bucket}/journal_attachments/{filename}"
                r = requests.post(storage_url, headers=headers, data=file_bytes, timeout=10)
                r.raise_for_status()
            except Exception as err:
                print(f"Failed to upload to Supabase: {err}")
                
        # Return path format compatible with the attachment endpoint
        return {"url": f"journal_attachments/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/attachments/{file_path:path}")
def get_attachment(file_path: str):
    from fastapi.responses import FileResponse, RedirectResponse
    import os
    
    if file_path.startswith("/"):
        file_path = file_path[1:]
        
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    filepath = os.path.join(upload_dir, file_path)
    if os.path.exists(filepath):
        return FileResponse(filepath)
        
    supabase_url = os.getenv("SUPABASE_URL", "https://rwglshhjtgwjudwdgkvf.supabase.co")
    supabase_bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "attachments")
    if supabase_url:
        cloud_url = f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/{file_path}"
        return RedirectResponse(cloud_url)
        
    raise HTTPException(status_code=404, detail="File not found")"""

    content = content.replace(old_upload, new_upload)
    
    with open(finance_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Backend patched")

def patch_frontend():
    for page in ['ExpensePage.tsx', 'JournalPage.tsx']:
        path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', page)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Add getPreviewUrl helper before return
        helper_str = """
  const getPreviewUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads/')) return `${baseApiUrl}${path}`;
    return `${baseApiUrl}/api/v1/finance/attachments/${path}`;
  };

  return ("""
  
        content = content.replace("  return (", helper_str, 1)
        
        # Update href and src to use getPreviewUrl
        content = content.replace("href={`${baseApiUrl}${previewPdf}`}", "href={getPreviewUrl(previewPdf)}")
        content = content.replace("src={`${baseApiUrl}${previewPdf}`}", "src={getPreviewUrl(previewPdf)}")
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"{page} patched")

patch_backend()
patch_frontend()
