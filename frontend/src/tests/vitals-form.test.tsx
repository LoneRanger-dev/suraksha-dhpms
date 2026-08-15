import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VitalsForm } from "@/components/clinical/VitalsForm";

describe("VitalsForm", () => {
  it("renders all vitals fields", () => {
    render(<VitalsForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/blood pressure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heart rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spo/i)).toBeInTheDocument();
  });

  it("shows a validation error for a malformed blood pressure value", async () => {
    const user = userEvent.setup();
    render(<VitalsForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/blood pressure/i), "notbp");
    await user.click(screen.getByRole("button", { name: /save vitals/i }));

    expect(await screen.findByText(/systolic\/diastolic format/i)).toBeInTheDocument();
  });

  it("calculates and displays BMI from weight and height", async () => {
    const user = userEvent.setup();
    render(<VitalsForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/weight/i), "70");
    await user.type(screen.getByLabelText(/height/i), "175");

    expect(await screen.findByText(/BMI: 22\.9/)).toBeInTheDocument();
  });

  it("submits valid vitals data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<VitalsForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/blood pressure/i), "120/80");
    await user.type(screen.getByLabelText(/heart rate/i), "78");
    await user.type(screen.getByLabelText(/temperature/i), "98.6");
    await user.type(screen.getByLabelText(/spo/i), "98");
    await user.click(screen.getByRole("button", { name: /save vitals/i }));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ bp: "120/80", pulse: 78, temp_f: 98.6, spo2: 98 })
    );
  });
});
