import re

with open("src/components/JournalView.tsx", "r") as f:
    content = f.read()

export_btn = """          <button
            onClick={() => setShowBatchExport(true)}
            className="h-10 px-3 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-xl flex items-center justify-center transition-all shrink-0 gap-2 font-bold text-sm shadow-sm"
            title="Batch Export"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>"""

# Remove the old export button
old_export_btn_regex = r'\s*<button\s*onClick=\{\(\) => setShowBatchExport\(true\)\}\s*className="[^"]*"\s*title="Batch Export"\s*>\s*<Download size=\{16\} />\s*<span className="hidden sm:inline">Export</span>\s*</button>'

content = re.sub(old_export_btn_regex, '', content)

# Insert it before the date navigator group
target_insertion = r'(<div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">)'
content = re.sub(target_insertion, r'\1\n' + export_btn, content)

with open("src/components/JournalView.tsx", "w") as f:
    f.write(content)
