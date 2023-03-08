import {
    AppLayout,
    Box,
    BreadcrumbGroup,
    Container,
    Button,
    BarChart,
    PieChart,
    Grid,
    Header,
    HelpPanel,
    SpaceBetween,
    Spinner,
    AreaChart,
    DateRangePicker
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Navigation from "./components/Navigation";
import { PieCharti18nStrings, BarCharti18nStrings, DateRangePickeri18nStrings } from "./components/labels";
import GitHubLinks from "./components/GitHubLinks";
import moment from "moment";
import { fetchStatistics } from "../redux/actions/statistics";
import NotificationFlashbar from "./components/NotificationFlashbar";

const Statistics = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const [forceRefresh, setForceRefresh] = useState(false);
    const [dateRange, setDateRange] = useState();

    const statsData = useSelector((state) => state.statistics.items);
    const statisticsLoading = useSelector((state) => state.statistics.status);
    const Config = useSelector((state) => state.config);
    const dispatch = useDispatch();

    /////////////////
    // LAZY LOADING
    /////////////////

    useEffect(() => {
        dispatch({ type: "notification/dismiss" });
        dispatch({ type: "selection/dismiss" });
        dispatch({ type: "modal/dismiss" });
    }, [dispatch]);

    useEffect(() => {
        if (!dateRange || dateRange.type === "relative") {
            setDateRange({
                type: "absolute",
                startDate: moment().add(-Config.STATISTICS_DEFAULT_PRE_DAYS, "days").format("YYYY-MM-DD"),
                endDate: moment().add(Config.STATISTICS_DEFAULT_POST_DAYS, "days").format("YYYY-MM-DD")
            });
            return;
        }
        dispatch(fetchStatistics(dateRange));
    }, [forceRefresh, dateRange, Config, dispatch]);

    const refreshNow = () => {
        setForceRefresh((refresh) => !refresh);
    };

    ///////////////
    // STATISTICS
    ///////////////

    const NoData = () => (
        <Box textAlign="center" color="inherit">
            <b>No data available</b>
            <Box variant="p" color="inherit">
                There is no data available
            </Box>
        </Box>
    );

    const Content = () => {
        return (
            <SpaceBetween size="m">
                <Header
                    variant="h1"
                    actions={
                        <SpaceBetween size="xxl" direction="horizontal">
                            <DateRangePicker
                                onChange={({ detail }) => {
                                    if (
                                        moment(detail.value.endDate).diff(moment(detail.value.startDate), "days") > 60
                                    ) {
                                        dispatch({
                                            type: "notification/error",
                                            message: "Statistics date range may not be larger than 60 days."
                                        });
                                    } else {
                                        setDateRange(detail.value);
                                    }
                                }}
                                value={dateRange}
                                i18nStrings={DateRangePickeri18nStrings}
                                dateOnly
                                placeholder="Filter statistics by date range"
                            />
                            <Button iconName="refresh" onClick={refreshNow} />
                        </SpaceBetween>
                    }
                >
                    Utilization and Usage Report
                </Header>
                <Grid gridDefinition={[{ colspan: 7 }, { colspan: 5 }]}>
                    <SpaceBetween size="m">
                        <Container header={<Header>Event Schedule</Header>}>
                            <BarChart
                                hideFilter
                                series={[
                                    {
                                        title: "Waiting",
                                        type: "bar",
                                        data: statsData.eventStats.Waiting,
                                        color: "#8af"
                                    },
                                    {
                                        title: "Running",
                                        type: "bar",
                                        data: statsData.eventStats.Running,
                                        color: "#5d5"
                                    },
                                    {
                                        title: "Terminated",
                                        type: "bar",
                                        data: statsData.eventStats.Terminated,
                                        color: "#e44"
                                    }
                                ]}
                                i18nStrings={{
                                    ...BarCharti18nStrings,
                                    xTickFormatter: (e) => moment(e).format(Config.STATISTICS_X_AXIS_DATE_FORMAT)
                                }}
                                ariaLabel="Event Schedule"
                                errorText="Error loading data."
                                height={150}
                                xDomain={statsData.xAxis}
                                statusType={statisticsLoading === "loading" ? "loading" : "finished"}
                                loadingText="Loading chart"
                                recoveryText="Retry"
                                xScaleType="categorical"
                                stackedBars
                                empty={<NoData />}
                            />
                        </Container>
                        <Container header={<Header>AWS Account lease utilization</Header>}>
                            <BarChart
                                hideFilter
                                series={[
                                    {
                                        title: "In use",
                                        type: "bar",
                                        data: statsData.leaseStats.leasesUsed,
                                        color: "#5d5"
                                    },
                                    {
                                        title: "Unused reservations",
                                        type: "bar",
                                        data: statsData.leaseStats.leasesUnused,
                                        color: "#8af"
                                    },
                                    {
                                        title: "current AWS account pool limit",
                                        type: "threshold",
                                        y: statsData.accountStats.all || [],
                                        color: "#e44"
                                    }
                                ]}
                                i18nStrings={{
                                    ...BarCharti18nStrings,
                                    xTickFormatter: (e) => moment(e).format(Config.STATISTICS_X_AXIS_DATE_FORMAT)
                                }}
                                ariaLabel="Leases"
                                errorText="Error loading data."
                                xDomain={statsData.xAxis}
                                height={150}
                                statusType={statisticsLoading === "loading" ? "loading" : "finished"}
                                loadingText="Loading chart"
                                recoveryText="Retry"
                                xScaleType="categorical"
                                stackedBars
                                empty={<NoData />}
                            />
                        </Container>
                        <Container header={<Header>AWS service spend in {Config.BUDGET_CURRENCY}</Header>}>
                            <AreaChart
                                hideFilter
                                series={[
                                    {
                                        title: "AWS service spend",
                                        type: "area",
                                        data: statsData.usageStats.usage,
                                        valueFormatter: (value) => "$ " + value.toFixed(2)
                                    }
                                ]}
                                i18nStrings={{
                                    ...BarCharti18nStrings,
                                    xTickFormatter: (e) => moment(e).format(Config.STATISTICS_X_AXIS_DATE_FORMAT)
                                }}
                                ariaLabel="AWS service spend"
                                errorText="Error loading data."
                                xDomain={statsData.xAxis}
                                height={150}
                                statusType={statisticsLoading === "loading" ? "loading" : "finished"}
                                loadingText="Loading chart"
                                recoveryText="Retry"
                                xScaleType="categorical"
                                stackedBars
                                empty={<NoData />}
                            />
                        </Container>
                    </SpaceBetween>
                    <SpaceBetween size="m">
                        <Container header={<Header>Average Statistics</Header>}>
                            {statisticsLoading === "loading" ? (
                                <Box padding={{ top: "l" }}>
                                    <SpaceBetween direction="horizontal" size="m">
                                        <Spinner />
                                        <Box>Loading data...</Box>
                                    </SpaceBetween>
                                </Box>
                            ) : (
                                <SpaceBetween size="xxl">
                                    <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                                        <Box>
                                            <Box textAlign="center">EVENT DURATION</Box>
                                            <Box textAlign="center" fontSize="display-l">
                                                {Math.floor(statsData.averageStats.eventDuration / 24)}d{" "}
                                                {Math.round(statsData.averageStats.eventDuration) % 24}h
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Box textAlign="center">LEASE LIFETIME</Box>
                                            <Box textAlign="center" fontSize="display-l">
                                                {Math.floor(statsData.averageStats.leaseLifetimeHours / 24)}d{" "}
                                                {Math.round(statsData.averageStats.leaseLifetimeHours) % 24}h
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                                        <Box>
                                            <Box textAlign="center">EVENT ACCOUNTS</Box>
                                            <Box textAlign="center" fontSize="display-l">
                                                {statsData.averageStats.accountsPerEvent.toFixed(1)}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Box textAlign="center">ACCOUNT UTILIZATION</Box>
                                            <Box textAlign="center" fontSize="display-l">
                                                {statsData.averageStats.accountUtilization.toFixed(0)} %
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                                        <Box>
                                            <Box textAlign="center">ACCOUNT SPEND</Box>
                                            <Box textAlign="center" fontSize="display-l">
                                                $ {statsData.averageStats.spendPerAccount.toFixed(2)}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Box textAlign="center">BUDGET UTILIZATION</Box>
                                            <Box
                                                textAlign="center"
                                                fontSize="display-l"
                                                color={
                                                    statsData.averageStats.budgetUtilization > 100
                                                        ? "text-status-error"
                                                        : "text-status-success"
                                                }
                                            >
                                                {statsData.averageStats.budgetUtilization.toFixed(0)} %
                                            </Box>
                                        </Box>
                                    </Grid>
                                </SpaceBetween>
                            )}
                        </Container>
                        <Container header={<Header>AWS Account pool</Header>}>
                            <PieChart
                                hideFilter
                                hideLegend
                                variant="donut"
                                innerMetricDescription="accounts"
                                innerMetricValue={statsData.accountStats.all}
                                data={[
                                    {
                                        title: "Free",
                                        value: statsData.accountStats.Ready,
                                        color: "#5d5"
                                    },
                                    {
                                        title: "Leased",
                                        value: statsData.accountStats.Leased,
                                        color: "#8af"
                                    },
                                    {
                                        title: "Cleaning",
                                        value: statsData.accountStats.NotReady,
                                        color: "#e44"
                                    }
                                ]}
                                i18nStrings={PieCharti18nStrings}
                                ariaDescription="Overview of AWS account pool."
                                ariaLabel="Pie chart"
                                errorText="Error loading data."
                                statusType={statisticsLoading === "loading" ? "loading" : "finished"}
                                loadingText="Loading chart"
                                recoveryText="Retry"
                                size="medium"
                                segmentDescription={(item, sum) =>
                                    `${item.value} accounts, ${((item.value / sum) * 100).toFixed(0)}%`
                                }
                                empty={<NoData />}
                            />
                        </Container>
                        <Container header={<Header>Lease termination reasons</Header>}>
                            <PieChart
                                hideFilter
                                hideLegend
                                data={[
                                    {
                                        title: "Expired",
                                        value: statsData.averageStats.leaseTerminationReason.Expired
                                    },
                                    {
                                        title: "Over Budget",
                                        value: statsData.averageStats.leaseTerminationReason.OverBudget
                                    },
                                    {
                                        title: "Manual",
                                        value: statsData.averageStats.leaseTerminationReason.Destroyed
                                    },
                                    {
                                        title: "Failure",
                                        value: statsData.averageStats.leaseTerminationReason.Rollback
                                    }
                                ]}
                                i18nStrings={PieCharti18nStrings}
                                ariaDescription="Overview of lease termination reasons."
                                ariaLabel="Pie chart"
                                errorText="Error loading data."
                                statusType={statisticsLoading === "loading" ? "loading" : "finished"}
                                loadingText="Loading chart"
                                recoveryText="Retry"
                                size="medium"
                                segmentDescription={(item, sum) => `${((item.value / sum) * 100).toFixed(0)}%`}
                                empty={<NoData />}
                            />
                        </Container>
                    </SpaceBetween>
                </Grid>
            </SpaceBetween>
        );
    };

    //////////////////
    // APP + CONTENT
    //////////////////

    return (
        <AppLayout
            navigation={<Navigation />}
            breadcrumbs={
                <BreadcrumbGroup
                    items={[
                        { text: "Admin", href: "#" },
                        { text: "Event Statistics", href: "#/events/statistics" }
                    ]}
                />
            }
            contentType="default"
            tools={<SideHelp />}
            stickyNotifications
            notifications={<NotificationFlashbar />}
            content={<Content />}
        />
    );
};

const SideHelp = () => (
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
        <Box>
            <Header variant="h3">Statistics</Header>
            <SpaceBetween size="m">
                <Box>This dashboard provides an overview of current AWS account utilization and usage.</Box>
                <Box>
                    <strong>AWS Accounts</strong>
                    <br />
                    Statistics on how many AWS accounts are currently registered in Sandbox Accounts for Events and how they are utilized.
                </Box>
                <Box>
                    <strong>AWS Account Leases</strong>
                    <br />
                    Statistics on active and terminated AWS account leases as well as their lifetime.
                </Box>
                <Box>
                    <strong>Events</strong>
                    <br />
                    Statistics on event dates and utilization.
                </Box>
                <Box>
                    <strong>Spend</strong>
                    <br />
                    Statistics on AWS service spend in leased AWS accounts.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default Statistics;
