import React from 'react';
import ReactDOM from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Portal: React.FC<PortalProps> = ({ children, style }) => {
  const portalRoot = document.getElementById('portal-root');
  return portalRoot ? ReactDOM.createPortal(<div style={style}>{children}</div>, portalRoot) : null;
};

export default Portal;
