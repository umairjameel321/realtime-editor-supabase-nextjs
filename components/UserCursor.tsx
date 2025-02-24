import React from "react";

interface CursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
}

const UserCursor: React.FC<CursorProps> = ({ x, y, color, name }) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
      }}
    >
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          transform: "rotate(-5deg)",
        }}
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
        />
      </svg>

      <div
        className="absolute left-4 top-0 px-2 py-1 rounded-md text-xs text-white whitespace-nowrap"
        style={{
          backgroundColor: color,
          transform: "translateY(-100%)",
          opacity: 0.9,
          zIndex: 9999,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {name}
      </div>
    </div>
  );
};

export default UserCursor;
