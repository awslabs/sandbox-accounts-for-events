import { render, screen, act } from "@testing-library/react";
import { test, expect, vi } from "vitest"
import Statistics from "./Statistics";
import * as redux from "react-redux";
import store from "../redux/store";
import * as actions from "../redux/actions/statistics";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders Statistics,", async () => {

    const fetchStatisticsAction = vi.spyOn(actions, "fetchStatistics").mockImplementation((stats) => () => stats)

    await act(async () => {
        render(
            <ReduxProvider reduxStore={store}>
                <Statistics/>
            </ReduxProvider>
        );
    })

    expect(fetchStatisticsAction).toHaveBeenCalled;

    // basic text checks
    expect(screen.getByText(/utilization and usage report/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /event schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /average statistics/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /aws account lease utilization/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /aws account pool/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /aws service spend in usd/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /lease termination reasons/i })).toBeInTheDocument();
});
