#!/usr/bin/env python3
"""Stage 2a content script (idempotent). For every risky plan in story, bank and practice:
- rule rows (Policy / Runbook / Playbook / Change type / CRM rules / Records policy) get redFlag false;
- exactly one row gets "proof": true: an existing proof row if present, else the LAST red fact row.
Prints a per-file report. Usage: proof-rows.py <app-root> [--check]"""
import json, re, sys, glob, os
RULE = re.compile(r'\b(policy|runbook|playbook)\b|^change type$|^crm rules$', re.I)
root = sys.argv[1]; check = '--check' in sys.argv
files = sorted(glob.glob(f'{root}/content/*/encounter-01.json') + glob.glob(f'{root}/content/*/bank/tickets-*.json') + glob.glob(f'{root}/content/*/practice.json'))
tot = {'plans': 0, 'unflag': 0, 'proof_set': 0, 'proof_not_last': 0}
def steps_of(d):
    if isinstance(d, dict) and 'steps' in d: return d['steps']
    ts = d['tickets'] if isinstance(d, dict) and 'tickets' in d else d
    return [s for t in ts for s in t['steps']]
for f in files:
    d = json.load(open(f)); changed = False; rep = []
    for s in steps_of(d):
        if s['safe']: continue
        ev = s['evidence']; tot['plans'] += 1
        for e in ev:
            if RULE.search(e['label']) and e.get('redFlag'):
                e['redFlag'] = False; tot['unflag'] += 1; changed = True
        facts = [i for i, e in enumerate(ev) if e.get('redFlag')]
        assert facts, f'{f} {s["id"]}: no red fact row left'
        have = [i for i, e in enumerate(ev) if e.get('proof')]
        if len(have) != 1:
            for e in ev: e.pop('proof', None)
            ev[facts[-1]]['proof'] = True; tot['proof_set'] += 1; changed = True
            have = [facts[-1]]
        assert have[0] != 0 and ev[have[0]]['redFlag'] and not RULE.search(ev[have[0]]['label'])
        if have[0] != len(ev) - 1: tot['proof_not_last'] += 1
        rep.append(f'{s["id"]}: proof = "{ev[have[0]]["label"]}" (row {have[0]} of {len(ev)}; red facts {len(facts)})')
    if changed and not check:
        with open(f, 'w') as fh: fh.write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
    print(f'## {os.path.relpath(f, root)}'); print('\n'.join('  ' + r for r in rep))
print(tot)
