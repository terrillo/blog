import { rhythm as createRhythm, groteskSansFamily, textColors } from '../utils/typography';
import { ObjectInterpolation } from '@emotion/core';

export const variables = {
  colors: {
    text: textColors,
  },
};

export const stretch: ObjectInterpolation<any> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const grotesk: ObjectInterpolation<any> = {
  fontFamily: groteskSansFamily.join(', '),
};

const unanchor: ObjectInterpolation<any> = {
  color: 'unset',
  textDecoration: 'none',
};

export const resets = {
  unanchor,
};

export const textColor = {
  primary: { color: variables.colors.text.primary },
  secondary: { color: variables.colors.text.secondary },
  disabled: { color: variables.colors.text.disabled },
};

export enum Side {
  Top = 1 << 0,
  Right = 1 << 1,
  Bottom = 1 << 2,
  Left = 1 << 3,
  Vertical = Side.Top | Side.Bottom,
  Horizontal = Side.Left | Side.Right,
}

export function padding(rhythm: number, sides = Side.Vertical | Side.Horizontal): ObjectInterpolation<any> {
  const amount = createRhythm(rhythm);
  return {
    paddingTop: sides & Side.Top ? amount : undefined,
    paddingRight: sides & Side.Right ? amount : undefined,
    paddingBottom: sides & Side.Bottom ? amount : undefined,
    paddingLeft: sides & Side.Left ? amount : undefined,
  };
}

export function margin(rhythm: number, sides = Side.Vertical | Side.Horizontal): ObjectInterpolation<any> {
  const amount = createRhythm(rhythm);
  return {
    marginTop: sides & Side.Top ? amount : undefined,
    marginRight: sides & Side.Right ? amount : undefined,
    marginBottom: sides & Side.Bottom ? amount : undefined,
    marginLeft: sides & Side.Left ? amount : undefined,
  };
}