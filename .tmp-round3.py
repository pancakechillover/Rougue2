"""Round-3 cleanup: imports, unused function decls, write-only let bindings."""
import re, io, sys

TARGETS = {
    'src/components/icons/AppIcon.tsx': ['import_react'],
    'src/components/icons/HandDrawnIcons.tsx': ['import_react'],
    'src/components/icons/TreasureChestIcon.tsx': ['import_react'],
    'src/components/record/Stats.tsx': ['maxperiod'],
    'src/components/settings/CloudSyncModal.tsx': ['phraseindex'],
    'src/components/settings/DevResourceControl.tsx': ['import_react', 'fn_urlb64'],
    'src/components/settings/LevelRewardsSettings.tsx': ['fn_urlb64'],
    'src/components/settings/RewardSettings.tsx': ['fn_urlb64'],
    'src/components/settings/Settings.tsx': ['fn_urlb64'],
    'src/components/settings/ShopSettings.tsx': ['fn_urlb64'],
    'src/components/settings/RealtimeProbabilityModal.tsx': ['import_react'],
    'src/components/settings/RewardStatsModal.tsx': ['import_react'],
    'src/components/settings/GachaSettings.tsx': ['import_react', 'fn_urlb64'],
    'src/components/settings/TimerSettingsSection.tsx': ['import_react', 'fn_urlb64'],
    'src/components/dashboard/DashboardView.tsx': ['hasmarkdown'],
}

def del_lines(lines, pred, count=1):
    idxs = [i for i, l in enumerate(lines) if pred(l)]
    for i in reversed(idxs[:count] if count else idxs):
        del lines[i]
    return len(idxs)

def del_braced_block(lines, start_pred):
    for i, l in enumerate(lines):
        if start_pred(l):
            depth = 0
            started = False
            for j in range(i, len(lines)):
                depth += lines[j].count('{') - lines[j].count('}')
                if '{' in lines[j]:
                    started = True
                if started and depth <= 0:
                    del lines[i:j + 1]
                    return 1
            return 0
    return 0

total = 0
for f, ops in TARGETS.items():
    lines = io.open(f, encoding='utf-8').read().split('\n')
    n = 0
    if 'import_react' in ops:
        n += del_lines(lines, lambda l: l.strip() == "import React from 'react';")
    if 'fn_urlb64' in ops:
        n += del_braced_block(lines, lambda l: l.strip().startswith('function __urlBase64ToUint8Array'))
    if 'maxperiod' in ops:
        n += del_lines(lines, lambda l: l.strip() == "let maxPeriod = 'Morning';")
        n += del_lines(lines, lambda l: re.match(r'^\s*maxPeriod = ', l))
    if 'phraseindex' in ops:
        n += del_lines(lines, lambda l: l.strip() == 'let __currentPhraseIndex = 0;')
        n += del_lines(lines, lambda l: re.match(r'^\s*__currentPhraseIndex = ', l))
    if 'hasmarkdown' in ops:
        n += del_lines(lines, lambda l: l.strip() == 'let __hasMarkdownBlock = false;')
        n += del_lines(lines, lambda l: re.match(r'^\s*__hasMarkdownBlock = ', l))
    io.open(f, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print(f'{f}: {n} removals')
    total += n
print(f'total: {total}')
