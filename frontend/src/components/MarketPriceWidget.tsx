import React from "react";

const marketPrices = [
  { crop: "Wheat", price: "₹2400 / quintal" },
  { crop: "Rice", price: "₹3100 / quintal" },
  { crop: "Cotton", price: "₹7200 / quintal" },
  { crop: "Maize", price: "₹2100 / quintal" },
];

const MarketPriceWidget = () => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      <h2>Local Market Prices</h2>

      {marketPrices.map((item) => (
        <div
          key={item.crop}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
          }}
        >
          <span>{item.crop}</span>
          <strong>{item.price}</strong>
        </div>
      ))}
    </div>
  );
};

export default MarketPriceWidget;