# MyPayroll Payslip Redesign

## Goal

Redesign the employee-facing MyPayroll view as a printable payslip inspired by the approved reference image, while keeping every displayed value backed by the existing payroll API.

## Scope

- Change the employee MyPayroll presentation and the employee cell in the HR Payroll results table, plus their focused tests/i18n.
- Keep payroll administration, calculation, settings, lifecycle, and API routes unchanged unless a required payslip field is genuinely absent from the current response.
- Reuse the existing `PayslipStatement` component, shared UI, Ant Design, authenticated employee avatar, and current locale-aware money/date formatting.
- Add no frontend dependency.

## Layout

The payslip is a centered white document surface with a restrained border and shadow. It remains readable in light and dark application themes while preserving a paper-like payslip surface.

1. Header
   - Company name and optional logo.
   - Payslip title and payroll period.
   - Optional company address, tax code, payroll email, and payroll phone when supplied by backend settings.

2. Employee information panel
   - Responsive four-column grid on wide screens and one/two columns on narrow screens.
   - Employee name, code, department, team, job title, employment type, start date, workdays, standard workdays, and currency.
   - Employee avatar is shown beside identity information when available.
   - Missing optional values render as an em dash, never invented values.

3. Payroll breakdown
   - Two columns on desktop, stacked on mobile.
   - Green-accented income column: base salary, salary by attendance, overtime groups, allowances, and positive adjustments.
   - Red-accented deduction column: social insurance, health insurance, unemployment insurance, personal income tax, and negative adjustments.
   - Nested detail rows use the payroll result's item labels and amounts. A formula hint is displayed only when every operand is available from the backend snapshot; otherwise it is omitted.

4. Totals
   - Gross income, total deductions, and net income are visually separated at the bottom.
   - Net income is the primary value and uses the configured company currency.

5. HR Payroll employee column
   - Show the employee's authenticated avatar beside their full name and employee code in the payroll results table.
   - Reuse the shared `EmployeeAvatar` component and fall back to initials when no avatar is available.

## Data Rules

- `PayrollResult` remains the source of truth for calculated amounts.
- Company identity and currency come from the payroll settings snapshot returned with the result.
- Insurance, overtime, allowances, adjustments, workdays, and totals are rendered only from response fields.
- The frontend performs display-only grouping and formatting; it must not recalculate payroll totals.
- A missing value displays `—`; a real numeric zero displays `0` in the configured currency.

## Responsive and Accessibility

- Desktop: employee metadata uses up to four columns and income/deductions use two equal columns.
- Tablet/mobile: all content stacks without horizontal scrolling.
- Use semantic section headings, definition lists for metadata, readable contrast, and text labels in addition to color.
- Preserve locale-aware Vietnamese/English labels and number/date formatting.

## Verification

- Update the focused `PayslipStatement` test to cover employee metadata, avatar, income/deduction grouping, zero values, totals, and missing optional data.
- Cover the HR Payroll employee cell's avatar and fallback identity rendering.
- Run focused ESLint, TypeScript typecheck, focused Vitest, production build, and `git diff --check`.

## Out of Scope

- PDF generation, print-specific pagination, payslip email redesign, payroll formula changes, and new payroll configuration fields.
