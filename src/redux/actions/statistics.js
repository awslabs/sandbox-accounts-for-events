import { API, graphqlOperation } from "@aws-amplify/api";
import * as queries from "../../graphql/queries";
import moment from "moment";

const initialState = {
    status: "idle",
    items: {
        accountStats: {},
        eventStats: {
            Waiting: [],
            Running: [],
            Terminated: []
        },
        leaseStats: {
            leasesUnused: [],
            leasesUsed: []
        },
        usageStats: {
            usage: []
        },
        averageStats: {
            leaseTerminationReason: {},
            leaseLifetimeHours: 0,
            accountsPerEvent: 0,
            accountUtilization: 0,
            eventDuration: 0,
            spendPerAccount: 0,
            budgetUtilization: 0
        },
        xAxis: []
    }
};

const statistics = (state = initialState, action) => {
    switch (action.type) {
        case "statistics/loading":
            return {
                ...state,
                status: "loading"
            };
        case "statistics/loaded":
            return {
                items: action.payload,
                status: "idle"
            };
        case "statistics/loadError":
            return initialState;
        default:
            return state;
    }
};

export const fetchStatistics = (dateRange) => async (dispatch) => {
    try {
        const mStartDate = moment(dateRange.startDate);
        const mEndDate = moment(dateRange.endDate);
        dispatch({ type: "statistics/loading" });

        const response = await Promise.all([
            API.graphql(graphqlOperation(queries.listEvents)),
            API.graphql(graphqlOperation(queries.safeOperatorApi, { action: "getStatistics" }))
        ]);
        const payload = JSON.parse(response[1].data.safeOperatorApi);
        if (!payload || payload.status === "error") {
            throw payload;
        }
        if (payload.status === "success") {
            const events = response[0].data.listEvents.items;
            const { accounts, leases, usage } = payload.body;
            let accountStats = {
                Ready: 0,
                NotReady: 0,
                Leased: 0,
                all: 0
            };
            accounts.forEach((account) => accountStats[account.accountStatus]++);
            accountStats.all = accountStats.Ready + accountStats.NotReady + accountStats.Leased;

            let eventStats = {
                Waiting: [],
                Running: [],
                Terminated: []
            };
            let leaseStats = {
                leasesUsed: [],
                leasesUnused: []
            };
            let usageStats = {
                usage: []
            };
            let averageStats = {
                eventDuration: { total: 0, count: 0 },
                accountsPerEvent: { total: 0, count: 0 },
                accountUtilization: { total: 0, count: 0 },
                budgetUtilization: { total: 0, count: 0 },
                spendPerAccount: { total: 0, count: 0 },
                leaseLifetimeHours: { total: 0, count: 0 },
                leaseTerminationReason: {
                    Expired: 0,
                    OverBudget: 0,
                    Destroyed: 0,
                    Rollback: 0,
                    total: 0
                }
            };

            let dates = {};
            for (let date = moment(mStartDate); date <= mEndDate; date.add(1, "days")) {
                dates[date] = {
                    leases: {
                        Active: 0,
                        Inactive: 0
                    }
                };
            }

            leases.forEach(
                ({ createdOn, expiresOn, principalId, accountId, budgetAmount, leaseStatus, leaseStatusReason }) => {
                    const mCreatedDay = moment.unix(createdOn).startOf("day");
                    const mExpiresDay = moment.unix(expiresOn).startOf("day");
                    if (mCreatedDay.isAfter(mEndDate) || mExpiresDay.isBefore(mStartDate)) return;
                    for (let day = mCreatedDay; day.isSameOrBefore(mExpiresDay); day.add(1, "days")) {
                        let leaseDate = leaseStats.leasesUsed.find((item) => item.x === day.valueOf());
                        if (leaseDate) {
                            leaseDate.y++;
                        } else {
                            leaseStats.leasesUsed.push({
                                x: day.valueOf(),
                                y: 1
                            });
                        }
                    }

                    const leaseBudgetUtilization =
                        usage.reduce(
                            (sum, item) =>
                                item.principalId === principalId && item.accountId === accountId
                                    ? sum + parseFloat(item.costAmount)
                                    : sum,
                            0.0
                        ) / budgetAmount;

                    averageStats.budgetUtilization.total += leaseBudgetUtilization;
                    averageStats.budgetUtilization.count++;
                    averageStats.leaseLifetimeHours.total += moment
                        .unix(expiresOn)
                        .diff(moment.unix(createdOn), "hours");
                    averageStats.leaseLifetimeHours.count++;
                    averageStats.accountUtilization.count++;
                    if (leaseStatus === "Inactive") {
                        averageStats.leaseTerminationReason.total++;
                        averageStats.leaseTerminationReason[leaseStatusReason]++;
                    }
                }
            );

            let accountSpend = {};
            usage.forEach(({ startDate, costAmount, accountId }) => {
                const day = moment.unix(startDate).startOf("day");
                if (day.isAfter(mEndDate) || day.isBefore(startDate)) return;
                let usageDate = usageStats.usage.find((item) => item.x === day.valueOf());
                if (usageDate) {
                    usageDate.y += costAmount;
                } else {
                    usageStats.usage.push({
                        x: day.valueOf(),
                        y: costAmount
                    });
                }
                if (accountSpend[accountId]) {
                    accountSpend[accountId] += costAmount;
                } else {
                    accountSpend[accountId] = costAmount;
                }
            });
            usageStats.usage = usageStats.usage.sort((a, b) => (a.x < b.x ? -1 : 1));
            Object.values(accountSpend).forEach((spend) => (averageStats.spendPerAccount.total += spend));
            averageStats.spendPerAccount.count = Object.keys(accountSpend).length;

            events.forEach(({ eventOn, eventDays, eventHours, eventStatus, maxAccounts }) => {
                const mEventStartDay = moment.unix(eventOn).startOf("day");
                const mEventEndDay = moment
                    .unix(eventOn)
                    .add(eventDays, "days")
                    .add(eventHours, "hours")
                    .startOf("day");
                if (mEventStartDay.isAfter(mEndDate) || mEventEndDay.isBefore(mStartDate)) return;
                for (let day = mEventStartDay; day.isSameOrBefore(mEventEndDay); day.add(1, "days")) {
                    let eventDate = eventStats[eventStatus].find((item) => item.x === day.valueOf());
                    if (eventDate) {
                        eventDate.y++;
                    } else {
                        eventStats[eventStatus].push({
                            x: day.valueOf(),
                            y: 1
                        });
                    }
                    let leaseDate = leaseStats.leasesUnused.find((item) => item.x === day.valueOf());
                    if (leaseDate) {
                        leaseDate.y += maxAccounts;
                    } else {
                        leaseStats.leasesUnused.push({
                            x: day.valueOf(),
                            y: maxAccounts
                        });
                    }
                }
                averageStats.eventDuration.total += eventDays * 24 + eventHours;
                averageStats.eventDuration.count++;
                averageStats.accountsPerEvent.total += maxAccounts;
                averageStats.accountsPerEvent.count++;
                averageStats.accountUtilization.total += maxAccounts;
            });

            const xAxis = [];
            for (let day = moment(mStartDate); day.isSameOrBefore(mEndDate); day.add(1, "days")) {
                xAxis.push(day.valueOf());
            }

            dispatch({
                type: "statistics/loaded",
                payload: {
                    accountStats,
                    eventStats,
                    leaseStats,
                    usageStats,
                    averageStats: {
                        eventDuration:
                            averageStats.eventDuration.count === 0
                                ? 0
                                : averageStats.eventDuration.total / averageStats.eventDuration.count,
                        accountsPerEvent:
                            averageStats.accountsPerEvent.count === 0
                                ? 0
                                : averageStats.accountsPerEvent.total / averageStats.accountsPerEvent.count,
                        spendPerAccount:
                            averageStats.spendPerAccount.count === 0
                                ? 0
                                : averageStats.spendPerAccount.total / averageStats.spendPerAccount.count,
                        leaseLifetimeHours:
                            averageStats.leaseLifetimeHours.count === 0
                                ? 0
                                : averageStats.leaseLifetimeHours.total / averageStats.leaseLifetimeHours.count,
                        accountUtilization:
                            averageStats.accountUtilization.total === 0
                                ? 0
                                : (averageStats.accountUtilization.count / averageStats.accountUtilization.total) * 100,
                        budgetUtilization:
                            averageStats.budgetUtilization.count === 0
                                ? 0
                                : (averageStats.budgetUtilization.total / averageStats.budgetUtilization.count) * 100,
                        leaseTerminationReason: averageStats.leaseTerminationReason
                    },
                    xAxis
                }
            });
        }
    } catch (error) {
        console.error(error);
        dispatch({ type: "statistics/loadError" });
        dispatch({ type: "notification/error", message: "Error during event login." });
    }
};

export default statistics;
