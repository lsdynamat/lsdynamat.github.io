# HOW_TO_ADD_NEW_MATERIAL_MODEL.md

1. To add a new LS-DYNA material model to LS-DYNA Material Hub, you must update FIVE places (this is the complete, “standard” flow): (1) create the generator file, (2) export it in the generators index.js, (3) register it in assets/data/materials.json, (4) record it in assets/data/changelog.json, and (5) add/update the documentation file in assets/docs/. If any of these steps is missing, the model may not appear, may not generate, or may not be documented properly.

Project layout (conceptual file map):

assets/
├── js/
│   └── generators/
│       ├── mat072_kcc.js
│       ├── mat084_winfrith.js
│       ├── mat159_cscm.js
│       ├── matXXX_newmodel.js          ← NEW generator
│       └── index.js                    ← MUST export new generator
├── data/
│   ├── materials.json                  ← MUST register new model + inputs
│   └── changelog.json                  ← MUST log the addition/change
└── docs/
    ├── mat072_kcc.md
    ├── mat084_winfrith.md
    ├── mat159_cscm.md
    └── matXXX_newmodel.md              ← NEW/UPDATED documentation

2. Create the generator file (assets/js/generators/matXXX_newmodel.js). The generator has exactly one responsibility: transform input values into LS-DYNA keyword text. Conceptually, its logic is:

generate(input):
    read values from input (fc, dmax, …)
    compute material parameters from those values
    assemble LS-DYNA keyword text
    return the keyword text

Rules: do not hard-code material constants (e.g., do not set fc = 30 inside the generator). All parameters must originate from input values.

3. Export the generator in assets/js/generators/index.js. The UI resolves generators through this index, so you must import the new generator module and export it following the same pattern used by existing generators. If you skip this, the UI will not find the generator even if materials.json is correct.

4. Register the model in assets/data/materials.json. This registry controls whether the model appears and which inputs the UI shows. A material entry conceptually includes:

material:
    id
    mat
    name
    category
    generator
    updatedAt
    doc (path to the md file in assets/docs, if your schema uses it)
    inputs[]

Each input definition conceptually includes:

input:
    key
    default
    label (optional)
    unit (optional)
    min/max (optional)
    hint (optional)

Critical rule: input.key must exactly match the variable name the generator reads. A key mismatch causes undefined values and wrong/unchanged output.

5. Update assets/data/changelog.json. Add a new changelog item using the SAME JSON schema already used in the file (same keys, same structure). At minimum, record the date (YYYY-MM-DD), action type (e.g., added/changed), and the model (MAT number + name). If your changelog tracks files/paths, include the generator path, the docs path, and the materials.json update in the entry.

6. Add/update documentation in assets/docs/. Create a markdown file for the model (e.g., assets/docs/matXXX_newmodel.md) that explains what the model is, what inputs mean, what units are assumed, typical ranges, references, and any important usage notes. If materials.json includes a doc field, ensure it points to this file. If the site renders a “Docs” button or link, this step is required for that link to work.

7. Final verification checklist (must all be true): the generator file exists, index.js exports it, materials.json has the correct entry (including inputs and any doc link), changelog.json contains the new entry using the correct schema, the docs markdown file exists in assets/docs, changing UI inputs changes the output keyword, and the browser cache has been refreshed so you are testing the latest code.
