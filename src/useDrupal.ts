import { useContext } from 'react';
import { DrupalInstance } from './DrupalClient';
import { DrupalContext } from './DrupalProvider';

export default function useDrupal(): DrupalInstance {
  const drupal = useContext(DrupalContext);
  if (!drupal) {
    throw Error('Missing Drupal.Provider');
  }
  return drupal;
}
