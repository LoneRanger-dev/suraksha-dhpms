import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QrReaderModal } from "@/components/qr/QrReaderModal";

const startMock = vi.fn();
const stopMock = vi.fn().mockResolvedValue(undefined);

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
  })),
}));

describe("QrReaderModal", () => {
  beforeEach(() => {
    startMock.mockReset();
    stopMock.mockClear();
  });

  it("shows the manual token fallback when the camera fails to start", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    render(<QrReaderModal onClose={() => {}} />);

    expect(await screen.findByLabelText(/patient id or token/i)).toBeInTheDocument();
  });

  it("looks up a manually entered token and renders the patient snapshot with an allergy alert", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          full_name: "Manvith M N",
          blood_group: "B+",
          allergies: "Penicillin",
        }),
      })
    );

    const user = userEvent.setup();
    render(<QrReaderModal onClose={() => {}} />);

    const input = await screen.findByLabelText(/patient id or token/i);
    await user.type(input, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByText("Manvith M N")).toBeInTheDocument();
    expect(await screen.findByText(/allergy alert/i)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<QrReaderModal onClose={onClose} />);

    await screen.findByLabelText(/patient id or token/i);
    await user.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
