import React from 'react';

interface DragPreviewProps {
  image: string;
}

const DragPreview: React.FC<DragPreviewProps> = ({ image }) => {
  return (
    <div className="item-icons">
      <img src={image} alt="drag preview" className="w-full h-full" />
    </div>
  );
};

export default DragPreview;
