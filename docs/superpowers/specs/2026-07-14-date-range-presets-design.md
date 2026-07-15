# Date Range Picker Presets Design

## Scope

Extend the shared `DateRangePicker` with four quick filters: Today, Yesterday, Last 7 days, and Last 30 days. Existing consumers keep the same `value` and `onChange` contract.

## Interaction

- Clicking a preset immediately calls `onChange` with the selected range and closes the popover.
- Today selects today for both start and end.
- Yesterday selects yesterday for both start and end.
- Last 7 days selects today and the previous six calendar days.
- Last 30 days selects today and the previous twenty-nine calendar days.
- Manual calendar selection keeps the existing Apply and Clear actions.

## Layout

- Desktop: presets appear in a vertical section on the left of the two calendar months.
- Mobile: presets appear in a horizontally scrollable row above the calendar.
- Static layout and spacing use Tailwind classes; date-cell state styling remains in MUI `sx`.
- All visible labels are translated in Vietnamese and English.

## Implementation Boundaries

- Add a pure preset-range helper so date calculations can be tested without rendering React.
- Keep the public component props unchanged.
- Do not change API query contracts or feature-specific pages.

## Verification

- Unit-test all four preset date ranges against a fixed current date.
- Run ESLint and the production build.
- Confirm the Scale route still loads through the running dev server.
