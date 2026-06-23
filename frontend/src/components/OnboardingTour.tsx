import React, { useEffect, useState } from "react";
import { Joyride, EVENTS, STATUS, EventData } from "react-joyride";

export default function OnboardingTour({
  setActiveTab,
}: {
  setActiveTab: (tab: string) => void;
}) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("agronavis-tour-seen");

    if (!seen) {
      setRun(true);
    }
  }, []);

  return (
    <Joyride
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={(data: EventData) => {
    const { action, index, status, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRun(false);
      localStorage.setItem("agronavis-tour-seen", "true");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === "prev" ? -1 : 1);

      if (nextStepIndex <= 2) {
        setActiveTab("map");
      } else {
        setActiveTab("cropscan");
      }

      setTimeout(() => {
        setStepIndex(nextStepIndex);
      }, 50);
    }
  }}
  styles={{
    buttonPrimary: {
      backgroundColor: '#10b981',
      borderRadius: '8px',
      padding: '8px 16px',
      fontWeight: 600,
    },
    buttonBack: {
      color: '#64748b',
    },
    tooltip: {
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    }
  }}
  options={{
    primaryColor: '#10b981',
    textColor: '#0f172a',
    zIndex: 10000,
  }}
  steps={[
    {
      target: "#polygon-search",
      content: "Search your village or farm location here."
    },
    {
      target: "#polygon-map",
      content: "Click on the map to drop pins and create your field boundary."
    },
    {
      target: "#confirm-boundary-btn",
      content: "Confirm and save the field boundary after drawing the polygon."
    },
    {
      target: "#cropscan-upload-zone",
      content: "Upload a leaf image here."
    },
    {
      target: "#cropscan-scan-btn",
      content: "Click here to scan the leaf and detect diseases."
    }
  ]}
/>
  );
}