import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { cleanup } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  Circle: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <div data-testid="circle" data-center={JSON.stringify(props.center)} data-radius={props.radius}>{children}</div>,
  Marker: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <div data-testid="marker" data-position={JSON.stringify(props.position)}>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
}));

import { render, screen } from "@testing-library/react";
import { AlertMapLayer } from "@/components/alerts/AlertMapLayer";

describe("AlertMapLayer", () => {
  afterEach(() => {
    cleanup();
  });

  const alertWithCircle = {
    id: "a1",
    title: "Wasserschaden",
    category: "water_damage" as const,
    status: "open" as const,
    location: { lat: 47.5535, lng: 7.964, exact: false, source: "gps" },
  };

  const alertWithPin = {
    id: "a2",
    title: "Sturz",
    category: "fall" as const,
    status: "open" as const,
    location: { lat: 47.554, lng: 7.965, exact: true, source: "gps" },
  };

  it("rendert einen Circle für nicht-exakte Position", () => {
    render(<AlertMapLayer alerts={[alertWithCircle]} />);
    expect(screen.getByTestId("circle")).toBeTruthy();
  });

  it("rendert einen Marker für exakte Position", () => {
    render(<AlertMapLayer alerts={[alertWithPin]} />);
    expect(screen.getByTestId("marker")).toBeTruthy();
  });

  it("zeigt Popup mit Alert-Titel", () => {
    render(<AlertMapLayer alerts={[alertWithCircle]} />);
    expect(screen.getByText("Wasserschaden")).toBeTruthy();
  });

  it("zeigt Hilfe-Button bei offenen Alerts mit onHelp", () => {
    render(<AlertMapLayer alerts={[alertWithCircle]} onHelp={vi.fn()} />);
    expect(screen.getByText("Ich kann helfen")).toBeTruthy();
  });

  it("zeigt keinen Hilfe-Button ohne onHelp", () => {
    render(<AlertMapLayer alerts={[alertWithCircle]} />);
    expect(screen.queryByText("Ich kann helfen")).toBeNull();
  });

  it("rendert mehrere Alerts gleichzeitig", () => {
    render(<AlertMapLayer alerts={[alertWithCircle, alertWithPin]} />);
    expect(screen.getAllByTestId("circle").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("marker")).toBeTruthy();
  });
});
