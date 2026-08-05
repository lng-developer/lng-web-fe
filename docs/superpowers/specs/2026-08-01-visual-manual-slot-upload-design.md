# Visual Manual Slot Upload Design

## Goal

Let production operators add a missing print-position file without knowing or entering technical `slotKey` and `slotLabel` values.

## User Flow

1. Open **Thêm vị trí in** from the Scale task drawer.
2. Choose a print position from visual cards.
3. Upload one design file by drag-and-drop or file picker.
4. Review the selected position and filename, then submit.

The modal first shows positions already configured by the task or product template. Common fallback cards are shown only for positions that are not already present: Front, Back, Left chest, Left sleeve, and Right sleeve. A final **Vị trí khác** card supports exceptional positions.

## Slot Mapping

Preset cards own their stable backend values; users do not edit them.

| Display label | `slotKey`      |
| ------------- | -------------- |
| Mặt trước     | `FRONT`        |
| Mặt sau       | `BACK`         |
| Ngực trái     | `LEFT_CHEST`   |
| Tay trái      | `LEFT_SLEEVE`  |
| Tay phải      | `RIGHT_SLEEVE` |

For **Vị trí khác**, the user enters only a display name. The frontend derives a key by removing Vietnamese diacritics, replacing non-alphanumeric runs with underscores, trimming separators, uppercasing the result, and prefixing it with `CUSTOM_`. The generated key is shown only inside collapsed technical details.

## UI States

- No position selected: upload and submit remain disabled.
- Preset selected: the card receives selected styling and the summary displays its label.
- Custom selected: a required **Tên vị trí** field appears.
- File selected: show the filename and allow replacement or removal.
- Submitting: disable duplicate submission and retain current loading behavior.
- Duplicate slot response: show a clear localized message that the position already exists.
- Other API failure: retain the modal contents so the operator can retry.

## Boundaries

- Keep the existing manual scaled-output API contract unchanged.
- Reuse Ant Design components and current modal/query patterns.
- Do not add a preset-management screen, dependency, or new backend model.
- The backend remains the final authority for key validation and duplicate prevention.

## Verification

- Component test: selecting a preset submits its mapped key and label.
- Component test: custom Vietnamese label produces a stable `CUSTOM_` key.
- Component test: submit is unavailable until both a position and file are selected.
- Existing production API test continues to verify multipart request fields.
- Run the narrow production tests, lint, and build.
