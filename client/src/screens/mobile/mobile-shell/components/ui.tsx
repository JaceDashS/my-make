import {createShellUi} from '../../../shared/shell-ui-factory';
import {mobileShellStyles as styles} from '../config/styles';
import type {MobileShellPalette} from '../model/types';

// モバイル UI の基本部品は components/ui.tsx から参照する。
const baseUi = createShellUi<MobileShellPalette>(styles);

export const {Card, OptionChip, BodyText, BodyStrong, FieldLabel} = baseUi;
