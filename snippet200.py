from pathlib import Path
path = Path('pages/AdminPage.tsx')
lines = path.read_text(encoding='latin-1').splitlines()
for idx in range(179, 261):
    print(f"{idx+1}: {lines[idx]}")
