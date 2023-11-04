/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const safeLoginApi = /* GraphQL */ `
  query SafeLoginApi($action: String, $paramJson: String) {
    safeLoginApi(action: $action, paramJson: $paramJson)
  }
`;
export const safeAdminApi = /* GraphQL */ `
  query SafeAdminApi($action: String, $paramJson: String) {
    safeAdminApi(action: $action, paramJson: $paramJson)
  }
`;
export const safeOperatorApi = /* GraphQL */ `
  query SafeOperatorApi($action: String, $paramJson: String) {
    safeOperatorApi(action: $action, paramJson: $paramJson)
  }
`;
export const getEvent = /* GraphQL */ `
  query GetEvent($id: ID!) {
    getEvent(id: $id) {
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
export const listEvents = /* GraphQL */ `
  query ListEvents(
    $filter: ModelEventFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getConfig = /* GraphQL */ `
  query GetConfig($id: ID!) {
    getConfig(id: $id) {
      id
      config
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listConfigs = /* GraphQL */ `
  query ListConfigs(
    $filter: ModelConfigFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        config
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
