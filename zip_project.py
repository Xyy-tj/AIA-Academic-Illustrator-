import os
import zipfile

def zip_directory(folder_path, output_path, exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = []
    
    # Convert exclude_dirs to absolute paths for easier comparison if needed, 
    # but strictly checking directory names is often enough for this use case.
    # We will check if the directory name is in the exclude list.
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = os.path.join(root, file)
                # Create a relative path for the archive
                # We want the archive to contain the folder itself or just contents?
                # Usually "zip backend" implies the zip contains "backend/..."
                # But sometimes users want contents at root. 
                # Let's assume standard behavior: zip contains the folder structure relative to the parent of folder_path.
                # However, to be safe and clean, let's make the zip root correspond to the folder_path name.
                
                # Calculate relative path from the parent of folder_path
                parent_dir = os.path.dirname(folder_path)
                arcname = os.path.relpath(file_path, parent_dir)
                
                zipf.write(file_path, arcname)
    
    print(f"Created {output_path}")

def main():
    base_dir = os.getcwd()
    
    # Backend compression
    backend_dir = os.path.join(base_dir, 'backend')
    backend_zip = os.path.join(base_dir, 'backend.zip')
    backend_excludes = ['.venv', '__pycache__']
    
    if os.path.exists(backend_dir):
        print(f"Zipping {backend_dir}...")
        zip_directory(backend_dir, backend_zip, backend_excludes)
    else:
        print(f"Directory not found: {backend_dir}")

    # Frontend compression
    frontend_dir = os.path.join(base_dir, 'frontend')
    frontend_zip = os.path.join(base_dir, 'frontend.zip')
    frontend_excludes = ['.next', 'node_modules']
    
    if os.path.exists(frontend_dir):
        print(f"Zipping {frontend_dir}...")
        zip_directory(frontend_dir, frontend_zip, frontend_excludes)
    else:
        print(f"Directory not found: {frontend_dir}")

if __name__ == "__main__":
    main()
