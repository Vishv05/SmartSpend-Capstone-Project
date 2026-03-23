import React from "react";

const StatCard = ({ label, value, trend }) => {
  return (
    <div className="card stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{trend}</div>
    </div>
  );
};

export default StatCard;
