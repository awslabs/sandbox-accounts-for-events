/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateEvent = /* GraphQL */ `
  subscription OnCreateEvent($filter: ModelSubscriptionEventFilterInput) {
    onCreateEvent(filter: $filter) {
      id
      eventName
      eventOn
      eventDays
      eventHours
      eventOwner
      maxAccounts
      eventBudget
      eventStatus
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateEvent = /* GraphQL */ `
  subscription OnUpdateEvent($filter: ModelSubscriptionEventFilterInput) {
    onUpdateEvent(filter: $filter) {
      id
      eventName
      eventOn
      eventDays
      eventHours
      eventOwner
      maxAccounts
      eventBudget
      eventStatus
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteEvent = /* GraphQL */ `
  subscription OnDeleteEvent($filter: ModelSubscriptionEventFilterInput) {
    onDeleteEvent(filter: $filter) {
      id
      eventName
      eventOn
      eventDays
      eventHours
      eventOwner
      maxAccounts
      eventBudget
      eventStatus
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateConfig = /* GraphQL */ `
  subscription OnCreateConfig($filter: ModelSubscriptionConfigFilterInput) {
    onCreateConfig(filter: $filter) {
      id
      config
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateConfig = /* GraphQL */ `
  subscription OnUpdateConfig($filter: ModelSubscriptionConfigFilterInput) {
    onUpdateConfig(filter: $filter) {
      id
      config
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteConfig = /* GraphQL */ `
  subscription OnDeleteConfig($filter: ModelSubscriptionConfigFilterInput) {
    onDeleteConfig(filter: $filter) {
      id
      config
      createdAt
      updatedAt
      __typename
    }
  }
`;
