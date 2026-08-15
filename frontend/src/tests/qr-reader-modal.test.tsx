import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

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
    pushMock.mockClear();
  });

  it("shows the manual token fallback when the camera fails to start", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    render(<QrReaderModal onClose={() => {}} />);

    expect(await screen.findByLabelText(/patient id or token/i)).toBeInTheDocument();
    expect(screen.getByText(/camera unavailable/i)).toBeInTheDocument();
  });

  it("also offers manual token entry when the camera starts successfully, since there may be no physical QR card to scan", async () => {
    startMock.mockResolvedValue(undefined);
    render(<QrReaderModal onClose={() => {}} />);

    expect(await screen.findByLabelText(/patient id or token/i)).toBeInTheDocument();
    expect(screen.queryByText(/camera unavailable/i)).not.toBeInTheDocument();
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

  it("clears the looked-up patient and input when Close is clicked, ready for the next patient", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          full_name: "Manvith M N",
          blood_group: "B+",
          allergies: "None",
        }),
      })
    );

    const user = userEvent.setup();
    render(<QrReaderModal onClose={() => {}} />);

    const input = await screen.findByLabelText(/patient id or token/i);
    await user.type(input, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByText("Manvith M N");

    await user.click(screen.getByRole("button", { name: /^close$/i }));

    expect(screen.queryByText("Manvith M N")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/patient id or token/i)).toHaveValue("");
  });

  it("checks the patient into a selected doctor's queue and shows the issued token", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/scan/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient_id: "22222222-2222-2222-2222-222222222222",
            full_name: "Manvith M N",
            blood_group: "B+",
            allergies: "None",
          }),
        });
      }
      if (String(url).includes("/appointments/queue")) {
        expect(init?.headers).toMatchObject({ Authorization: "Bearer staff-token" });
        return Promise.resolve({ ok: true, json: async () => ({ token_number: "CARDIO-001" }) });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <QrReaderModal
        onClose={() => {}}
        authToken="staff-token"
        doctors={[{ doctor_id: "d1", full_name: "Dr. Cardio", specialization: "Cardiology", department_name: "Cardiology" }]}
      />
    );

    const input = await screen.findByLabelText(/patient id or token/i);
    await user.type(input, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByText("Manvith M N");

    await user.selectOptions(screen.getByLabelText(/route to doctor/i), "d1");
    await user.click(screen.getByRole("button", { name: /generate queue token/i }));

    expect(await screen.findByText(/CARDIO-001/)).toBeInTheDocument();
  });

  it("lets a billing-eligible staff role send a looked-up patient to billing", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          patient_id: "33333333-3333-3333-3333-333333333333",
          full_name: "Manvith M N",
          blood_group: "B+",
          allergies: "None",
        }),
      })
    );

    const user = userEvent.setup();
    render(<QrReaderModal onClose={() => {}} authToken="staff-token" staffRole="RECEPTIONIST" />);

    const input = await screen.findByLabelText(/patient id or token/i);
    await user.type(input, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByText("Manvith M N");

    await user.click(screen.getByRole("button", { name: /bill patient/i }));

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/billing\/invoices\?patientId=33333333-3333-3333-3333-333333333333&patientName=/)
    );
  });

  it("hides the billing action for a role that cannot create invoices", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          patient_id: "44444444-4444-4444-4444-444444444444",
          full_name: "Manvith M N",
          blood_group: "B+",
          allergies: "None",
        }),
      })
    );

    const user = userEvent.setup();
    render(<QrReaderModal onClose={() => {}} authToken="staff-token" staffRole="NURSE" />);

    const input = await screen.findByLabelText(/patient id or token/i);
    await user.type(input, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByText("Manvith M N");

    expect(screen.queryByRole("button", { name: /bill patient/i })).not.toBeInTheDocument();
  });

  it("does not crash on unmount when the scanner never actually started (e.g. no camera)", async () => {
    startMock.mockRejectedValue(new Error("camera denied"));
    stopMock.mockImplementation(() => {
      throw new Error("Cannot stop, scanner is not running or paused.");
    });

    const { unmount } = render(<QrReaderModal onClose={() => {}} />);
    await screen.findByLabelText(/patient id or token/i);

    expect(() => unmount()).not.toThrow();

    stopMock.mockResolvedValue(undefined);
  });
});
