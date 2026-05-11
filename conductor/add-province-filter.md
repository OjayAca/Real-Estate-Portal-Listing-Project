# Implementation Plan - Add Province Filter to Properties Page

The goal is to improve the location filtering on the properties page by replacing the free-text province input with a select dropdown containing standard Philippine provinces. This will provide a better user experience for broad regional searches and ensure data consistency in filtering.

## User Review Required

> [!IMPORTANT]
> I noticed that a `Province` text input already exists in the code for `PropertiesPage.jsx`. I am assuming that "adding a province filter" in this context means upgrading this text input to a proper select dropdown with a pre-defined list of Philippine provinces, as this is much more effective for the "broad regional searching" mentioned in your request. Please confirm if this approach meets your expectations.

## Proposed Changes

### Frontend

#### 1. Define Provinces Constant
Add a `PHILIPPINE_PROVINCES` constant to `frontend/src/pages/PropertiesPage.jsx` containing the standard provinces of the Philippines.

#### 2. Update Filter UI
In `frontend/src/pages/PropertiesPage.jsx`, replace the `<input>` for the province filter with a `<select>` element.

```jsx
<select
  value={draftFilters.province}
  onChange={(event) => updateDraftFilter('province', event.target.value)}
>
  <option value="">All provinces</option>
  {PHILIPPINE_PROVINCES.map((p) => (
    <option key={p} value={p}>{p}</option>
  ))}
</select>
```

#### 3. Update Styles (if necessary)
Ensure the new select dropdown fits well within the `location-filter-grid`.

### Backend
The backend already supports filtering by `province` via the `?province=...` query parameter in `PropertyService.php`, so no backend changes are strictly required for the filter to work.

## Verification Plan

### Automated Tests
- I will check if there are existing frontend tests for `PropertiesPage`. If not, I'll focus on manual verification as frontend testing setup might be complex.
- Check `backend/tests/Feature/PropertySimilarListingsTest.php` or similar to see if I should add a test case for province filtering (though backend is already working).

### Manual Verification
1. Open the Properties page.
2. Verify that the "Province" field is now a dropdown.
3. Select a province (e.g., "Metro Manila") and apply filters.
4. Verify that the results only show properties in that province.
5. Verify that clearing filters resets the province selection.
