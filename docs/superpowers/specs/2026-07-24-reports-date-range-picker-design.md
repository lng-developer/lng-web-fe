# Reports Date Range Picker Design

## Goal

Replace the separate `Date from` and `Date to` inputs on Reports with the shared `DateRangePicker`, matching the approved two-month calendar reference without duplicating calendar logic.

## Component strategy

- Reuse `src/components/form/DateRangePicker.jsx`.
- Keep its public value contract: `{ start: Dayjs | null, end: Dayjs | null }`.
- Preserve presets: Today, Yesterday, Last 7 days, and Last 30 days.
- Keep desktop as two adjacent months and the compact breakpoint as one month.
- Adjust only the shared component styling needed to match the reference: compact rectangular popover, clear preset rail, square selected-day treatment, and bottom Clear/Apply actions.

## Reports integration

- Replace the two native date inputs with one full-width `DateRangePicker`.
- Convert report filter strings to Dayjs values when rendering the component.
- On Apply, write `YYYY-MM-DD` values back to `dateFrom` and `dateTo` together and synchronize the URL once.
- Clear writes empty values for both dates and removes both query parameters.
- Choosing dates inside the popover remains draft-only until Apply.

## Accessibility and interaction

- Retain keyboard focus styles and calendar cell accessible labels.
- Keep the calendar trigger read-only and expose the translated placeholder.
- Closing the popover without Apply leaves the active filters unchanged.

## Scope

- No backend changes.
- No new date-picker dependency.
- Existing consumers continue using the same component API.
- Only Reports changes from two date fields to the shared range picker.

## Verification

- Unit-test conversion between report string filters and the component range value.
- Composition-test that Reports uses `DateRangePicker` and no longer renders two native date inputs.
- Run existing report tests, focused lint, production build, and browser-check Clear/Apply plus URL synchronization.
