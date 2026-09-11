"""Verify lib/userWipe.js covers every entity/field that identifies a user.

Missing an entity here means a wiped user silently leaves orphaned rows
behind, which is how a "fresh" re-registration inherits stale state.
Run: python3 tools/check_wipe_coverage.py
"""
import json
import os
import re
import sys

lib = open("src/lib/userWipe.js").read()
covered = {}
# `excluded` fields are ones we deliberately refuse to match because they
# reference a DIFFERENT person than the row's owner (e.g. a subscription's
# referring teacher). Counting them as covered keeps this check honest
# without pressuring anyone into a cascade delete.
pattern = (
    r'\{[^}]*name:\s*"(\w+)",\s*emailFields:\s*\[([^\]]*)\],'
    r'\s*idFields:\s*\[([^\]]*)\](?:,\s*excluded:\s*\[([^\]]*)\])?'
)
for m in re.finditer(pattern, lib):
    name, ef, idf, exc = m.group(1), m.group(2), m.group(3), m.group(4) or ""
    covered[name] = set(re.findall(r'"(\w+)"', ef + "," + idf + "," + exc))

USER_FIELD = re.compile(
    r"^(user_email|user_id|student_email|student_phone|teacher_email|teacher_id|phone|email)$"
)

missing_entities, missing_fields = [], []
for f in sorted(os.listdir("base44/entities")):
    ent = f[:-6]
    if ent == "User":
        continue
    props = json.load(open(f"base44/entities/{f}")).get("properties", {})
    userish = {k for k in props if USER_FIELD.match(k)}
    if not userish:
        continue
    if ent not in covered:
        missing_entities.append((ent, sorted(userish)))
    else:
        gap = userish - covered[ent]
        if gap:
            missing_fields.append((ent, sorted(gap)))

print(f"covered entities: {len(covered)}")
print("uncovered entities with user fields:", missing_entities or "none")
print("covered entities missing a field:   ", missing_fields or "none")
sys.exit(1 if (missing_entities or missing_fields) else 0)
