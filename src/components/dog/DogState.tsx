import React from "react";

interface DogStateBubbleProps {
  text: string;
  onClose?: () => void;
}

export const DogStateBubble: React.FC<DogStateBubbleProps> = ({ text, onClose }) => {
  return (
    <div className="fd-pet-bubble" onClick={onClose}>
      <span className="fd-bubble-text">{text}</span>
      <div className="fd-bubble-arrow" />
    </div>
  );
};