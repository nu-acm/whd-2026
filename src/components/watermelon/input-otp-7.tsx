import type { ComponentProps } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

/** Watermelon input-otp-7: two groups of three digits, styled for WHD. */
export default function InputOtp7(
  props: Omit<ComponentProps<typeof InputOTP>, 'maxLength' | 'children' | 'render'>,
) {
  return (
    <InputOTP
      {...props}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      pasteTransformer={(text) => text.replace(/\D/g, '')}
    >
      <InputOTPGroup aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator aria-hidden="true" />
      <InputOTPGroup aria-hidden="true">
        {[3, 4, 5].map((index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
