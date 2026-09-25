import { Alert } from 'react-native';

import { UserFacingError } from '../data/errors';
import { t } from '../localization';

export function promptListName(
  onSave: (name: string) => void,
  isCurrent: () => boolean,
  name?: string,
) {
  function prompt(defaultValue?: string) {
    if (!isCurrent()) return;
    Alert.prompt(
      t(name === undefined ? 'lists.newList' : 'lists.rename'),
      t('lists.nameHint'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(name === undefined ? 'lists.create' : 'lists.save'),
          onPress: (value?: string) => {
            if (!isCurrent()) return;
            try {
              onSave(value ?? '');
            } catch (error) {
              Alert.alert(
                t('lists.couldNotSave'),
                error instanceof UserFacingError
                  ? error.message
                  : t('common.unknownError'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.retry'), onPress: () => prompt(value) },
                ],
              );
            }
          },
        },
      ],
      'plain-text',
      defaultValue,
    );
  }

  prompt(name);
}
