export const SplitPaneli18nStrings = {
    preferencesTitle: "Split panel preferences",
    preferencesPositionLabel: "Split panel position",
    preferencesPositionDescription: "Choose the default split panel position for the service.",
    preferencesPositionSide: "Side",
    preferencesPositionBottom: "Bottom",
    preferencesConfirm: "Confirm",
    preferencesCancel: "Cancel",
    closeButtonAriaLabel: "Close panel",
    openButtonAriaLabel: "Open panel",
    resizeHandleAriaLabel: "Resize split panel"
};

export const PropertyFilteri18nStrings = {
    filteringAriaLabel: "your choice",
    dismissAriaLabel: "Dismiss",

    filteringPlaceholder: "Search",
    groupValuesText: "Values",
    groupPropertiesText: "Properties",
    operatorsText: "Operators",

    operationAndText: "and",
    operationOrText: "or",

    operatorLessText: "Less than",
    operatorLessOrEqualText: "Less than or equal",
    operatorGreaterText: "Greater than",
    operatorGreaterOrEqualText: "Greater than or equal",
    operatorContainsText: "Contains",
    operatorDoesNotContainText: "Does not contain",
    operatorEqualsText: "Equals",
    operatorDoesNotEqualText: "Does not equal",

    editTokenHeader: "Edit filter",
    propertyText: "Property",
    operatorText: "Operator",
    valueText: "Value",
    cancelActionText: "Cancel",
    applyActionText: "Apply",
    allPropertiesLabel: "All properties",

    tokenLimitShowMore: "Show more",
    tokenLimitShowFewer: "Show fewer",
    clearFiltersText: "Clear filters",
    removeTokenButtonAriaLabel: () => "Remove token",
    enteredTextLabel: (text) => `Use: "${text}"`
};

export const PieCharti18nStrings = {
    detailsValue: "Value",
    detailsPercentage: "Percentage",
    filterLabel: "Filter displayed data",
    filterPlaceholder: "Filter data",
    filterSelectedAriaLabel: "selected",
    detailPopoverDismissAriaLabel: "Dismiss",
    legendAriaLabel: "Legend",
    chartAriaRoleDescription: "pie chart",
    segmentAriaRoleDescription: "segment"
};

export const BarCharti18nStrings = {
    filterLabel: "Filter displayed data",
    filterPlaceholder: "Filter data",
    filterSelectedAriaLabel: "selected",
    legendAriaLabel: "Legend",
    chartAriaRoleDescription: "line chart",
    yTickFormatter: (e) => (Math.ceil(e) === e ? e : "")
};

export const DateRangePickeri18nStrings = {
    todayAriaLabel: "Today",
    nextMonthAriaLabel: "Next month",
    previousMonthAriaLabel: "Previous month",
    customRelativeRangeDurationLabel: "Duration",
    customRelativeRangeDurationPlaceholder: "Enter duration",
    customRelativeRangeOptionLabel: "Custom range",
    customRelativeRangeOptionDescription: "Set a custom range in the past",
    customRelativeRangeUnitLabel: "Unit of time",
    formatUnit: (e) => e,
    dateTimeConstraintText: "Range must be between 6 - 30 days. Use 24 hour format.",
    relativeModeTitle: "Relative range",
    absoluteModeTitle: "Absolute range",
    relativeRangeSelectionHeading: "Choose a range",
    startDateLabel: "Start date",
    endDateLabel: "End date",
    startTimeLabel: "Start time",
    endTimeLabel: "End time",
    clearButtonLabel: "Clear",
    cancelButtonLabel: "Cancel",
    applyButtonLabel: "Apply"
};

export const TopNavigationi18nStrings = {
    searchIconAriaLabel: "Search",
    searchDismissIconAriaLabel: "Close search",
    overflowMenuTriggerText: "More",
    overflowMenuTitleText: "All",
    overflowMenuBackIconAriaLabel: "Back",
    overflowMenuDismissIconAriaLabel: "Close menu"
};

export const appLayoutLabels = {
    navigation: "Side navigation",
    navigationToggle: "Open side navigation",
    navigationClose: "Close side navigation",
    notifications: "Notifications",
    tools: "Help panel",
    toolsToggle: "Open help panel",
    toolsClose: "Close help panel"
};

export const paginationLabels = {
    nextPageLabel: "Next page",
    previousPageLabel: "Previous page",
    pageLabel: (pageNumber) => `Page ${pageNumber} of all pages`
};

export const externalLinkProps = {
    external: true,
    externalIconAriaLabel: "Opens in a new tab"
};

export const distributionSelectionLabels = {
    itemSelectionLabel: (_data, row) => `select ${row.id}`,
    allItemsSelectionLabel: () => "select all",
    selectionGroupLabel: "Distribution selection"
};

export const itemSelectionLabels = {
    itemSelectionLabel: (_data, row) => `select ${row.id}`,
    allItemsSelectionLabel: () => "select all",
    selectionGroupLabel: "Item selection"
};

export const originsSelectionLabels = {
    itemSelectionLabel: (_data, row) => `select ${row.name}`,
    allItemsSelectionLabel: () => "select all",
    selectionGroupLabel: "Origins selection"
};

export const behaviorsSelectionLabels = {
    itemSelectionLabel: (_data, row) => `select path ${row.pathPattern} from origin ${row.origin}`,
    allItemsSelectionLabel: () => "select all",
    selectionGroupLabel: "Behaviors selection"
};

export const logsSelectionLabels = {
    itemSelectionLabel: (_data, row) => `select ${row.name}`,
    allItemsSelectionLabel: () => "select all",
    selectionGroupLabel: "Logs selection"
};

const headerLabel = (title, sorted, descending) => {
    return `${title}, ${sorted ? `sorted ${descending ? "descending" : "ascending"}` : "not sorted"}.`;
};

export const addColumnSortLabels = (columns) =>
    columns.map((col) => ({
        ariaLabel: col.sortingField
            ? (sortState) => headerLabel(col.header, sortState.sorted, sortState.descending)
            : undefined,
        ...col
    }));

