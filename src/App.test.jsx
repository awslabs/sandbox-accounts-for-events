/**
* @vitest-environment jsdom
*/

import { render, screen, act } from "@testing-library/react";
import { test, expect } from "vitest"
import App from './App';

test('renders App with correct title and login dialog', async () => {
    await act(async () => {
        render(<App />);
    })

    expect(screen.getByRole("heading", { name:/sandbox accounts for events/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create new account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login to existing account/i })).toBeInTheDocument();

});
