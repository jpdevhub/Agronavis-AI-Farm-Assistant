import React, { useEffect, useState } from "react";
import { Joyride } from "react-joyride";

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

  useEffect(() => {
    if (stepIndex <= 2) {
      setActiveTab("map");
    } else {
      setActiveTab("cropscan");
    }
  }, [stepIndex, setActiveTab]);

  return (
    <Joyride
  run={run}
  stepIndex={stepIndex}
  continuous
  onEvent={(data) => {
    const { index } = data;

    if (index <= 2) {
      setActiveTab("map");
    } else {
      setActiveTab("cropscan");
    }

    setStepIndex(index);
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