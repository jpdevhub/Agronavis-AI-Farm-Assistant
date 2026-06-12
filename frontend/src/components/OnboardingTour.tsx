import React, { useEffect, useState } from "react";
import { Joyride } from "react-joyride";

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("agronavis-tour-seen");

    if (!seen) {
      setRun(true);
    }
  }, []);

  return (
    <Joyride
        run={run}
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