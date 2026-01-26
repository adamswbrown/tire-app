# Parity Test Plan (Electron vs Web)

## Goal
Ensure the web implementation matches the Electron app exactly for imports, scoring, saving, and exports.

## Test Data
- Use 2–3 XLSX fixtures:
  - Small (10–20 rows)
  - Medium (200–400 rows)
  - Large (800–1000 rows)
- Include both old and new formats with optional columns.
- Include mixed scope values and duplicate application names.

## Import/Parse Parity
- Verify required column validation matches Electron behavior.
- Verify optional columns are ignored without errors.
- Verify dedupe logic is identical (first occurrence wins).
- Verify "Unassociated" apps are filtered exactly as before.
- Compare app counts and field values vs Electron.

## Questionnaire Save/Load Parity
- For a sample app, complete app questions and strategy questions.
- Save, close, reopen, and verify responses are identical.
- Validate section skip logic still works.
- Validate scoring outputs match Electron values.

## Export Parity

### Completed Apps XLSX
- Generate export in Electron and Web from same input.
- Compare:
  - Worksheet name and ordering
  - Header row labels
  - Data values per row
  - Template formatting (if any formatting is relied upon)

### App Questions CSV
- Generate CSV in Electron and Web from same input.
- Compare:
  - Column order
  - Values and quoting
  - Row ordering

## Regression Tests
- Admin thresholds updated → scoring changes match Electron.
- Reset/clear data equivalents behave correctly in web context.

## Automation Suggestions
- Build a small fixture runner that:
  - Imports XLSX
  - Executes question saves with canned answers
  - Exports results
  - Compares files (CSV diff, XLSX value diff)

## Exit Criteria
- All parity checks pass for all fixtures.
- No discrepancies in exports or scoring.
- Stakeholder sign-off on results.

## Checklist (AI Agent Consumption)
- [ ] Fixtures prepared: small (10–20), medium (200–400), large (800–1000).
- [ ] Fixtures include old/new XLSX formats and optional columns.
- [ ] Fixtures include duplicate app names and \"Unassociated\" rows.
- [ ] Web import validates required columns exactly as Electron.
- [ ] Web import ignores missing optional columns without error.
- [ ] Dedupe logic matches (first occurrence wins).
- [ ] Filter logic matches (\"Unassociated\" excluded).
- [ ] App counts match Electron after import.
- [ ] App field values match Electron after import.
- [ ] App questions save/load matches Electron (answers identical).
- [ ] Strategy questions save/load matches Electron (answers identical).
- [ ] Section skip logic matches Electron behavior.
- [ ] Scoring output matches Electron values.
- [ ] Completed Apps XLSX export matches Electron values and layout.
- [ ] App Questions CSV export matches Electron values and column order.
- [ ] Threshold changes update scoring identically to Electron.
- [ ] Reset/clear data behavior matches expected web analog.
