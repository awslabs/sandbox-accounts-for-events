import { render, screen, act } from "@testing-library/react";
import { test, expect } from "vitest"
import Home from "./Home";
import * as redux from "react-redux";
import store from "../redux/store"; 

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders Home,", async () => {

    await act(async () => {
        render(
            <ReduxProvider reduxStore={store}>
                <Home />
            </ReduxProvider>
        );
    });

    // basic headline check
    expect(screen.getAllByText(/sandbox accounts for events/i))
})
