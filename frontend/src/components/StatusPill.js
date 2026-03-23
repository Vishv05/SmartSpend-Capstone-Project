import React from "react";

const StatusPill = ({ status }) => {
  const className = `pill pill--${status.toLowerCase()}`;
  return <span className={className}>{status}</span>;
};

export default StatusPill;
