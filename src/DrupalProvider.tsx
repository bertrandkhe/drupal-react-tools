import React from 'react'
import { DrupalInstance } from './DrupalClient';

export const DrupalContext = React.createContext<DrupalInstance | null>(null);

type ProviderProps = {
  instance: DrupalInstance,
  children: React.ReactNode,
};

export const DrupalProvider: React.FunctionComponent<ProviderProps> = (props) => {
  const { instance, children } = props;
  return (
    <DrupalContext.Provider
      value={instance}
      >
      {children}
      </DrupalContext.Provider>
  );
};

export default DrupalProvider;
